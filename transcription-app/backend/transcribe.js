import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ORGANIZATION_SYSTEM_PROMPT = `You are organizing transcriptions of voice memos. These recordings are about work divided between two organizations: Wavicle Data Solutions and Caltech.

Please:
1. Identify which organization (Wavicle Data Solutions or Caltech) the content relates to
2. Detect any client names mentioned
3. Organize the transcript into clear sections with headers
4. Group logically: by organization first, then by client if multiple clients are mentioned

Return a clean, structured transcript with clear markdown-style headers.

After the formatted transcript, append a JSON metadata block on its own line in this exact format:
METADATA_JSON: {"organization": "<Wavicle Data Solutions|Caltech|Unknown>", "clients": ["<client1>", "<client2>"]}

If no organization can be determined, use "Unknown". If no clients are detected, use an empty array.`;

/**
 * Transcribes an audio file using OpenAI Whisper, then post-processes
 * with GPT-4o-mini to organize by organization and client.
 *
 * @param {string} filePath - Absolute path to the uploaded audio file
 * @param {string} originalName - Original filename (used for context)
 * @returns {{ transcript: string, organization: string, clients: string[] }}
 */
export async function transcribeAudio(filePath, originalName) {
  // Step 1: Transcribe with Whisper
  const audioStream = fs.createReadStream(filePath);

  const whisperResponse = await openai.audio.transcriptions.create({
    file: await OpenAI.toFile(audioStream, originalName),
    model: 'whisper-1',
    prompt:
      'This is a voice memo about work at either Wavicle Data Solutions or Caltech. ' +
      'It may mention client names, project details, or task notes. ' +
      'Transcribe accurately, preserving proper nouns.',
    response_format: 'text',
  });

  const rawTranscript = whisperResponse;

  if (!rawTranscript || rawTranscript.trim().length === 0) {
    return {
      transcript: '(No speech detected in the audio file.)',
      organization: 'Unknown',
      clients: [],
    };
  }

  // Step 2: Post-process with GPT-4o-mini
  const chatResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: ORGANIZATION_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Please organize this voice memo transcript. The original filename was "${originalName}".\n\nRAW TRANSCRIPT:\n${rawTranscript}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  });

  const fullResponse = chatResponse.choices[0]?.message?.content || '';

  // Extract metadata JSON from the response
  let organization = 'Unknown';
  let clients = [];
  let transcript = fullResponse;

  const metadataMatch = fullResponse.match(/METADATA_JSON:\s*(\{.*\})\s*$/m);
  if (metadataMatch) {
    try {
      const metadata = JSON.parse(metadataMatch[1]);
      organization = metadata.organization || 'Unknown';
      clients = Array.isArray(metadata.clients) ? metadata.clients : [];
      // Remove the metadata line from the displayed transcript
      transcript = fullResponse.replace(/\nMETADATA_JSON:.*$/m, '').trim();
    } catch {
      // If JSON parse fails, keep defaults
      transcript = fullResponse.replace(/\nMETADATA_JSON:.*$/m, '').trim();
    }
  }

  return { transcript, organization, clients };
}
