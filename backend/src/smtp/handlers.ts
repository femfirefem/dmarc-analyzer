import type { SMTPServerDataStream, SMTPServerSession } from "npm:@types/smtp-server@3.5.10";
import { parseEmail } from "../mime/helpers.ts";

export function handleIncomingMail(
  stream: SMTPServerDataStream, 
  session: SMTPServerSession,
  callback: (error?: Error) => void
): void {
  const chunks: Uint8Array[] = [];
  let chunklen = 0;

  stream.on('data', (chunk: Uint8Array) => {
    chunks.push(chunk);
    chunklen += chunk.length;
    console.log(`Received chunk: ${chunk.length} bytes from ${session.remoteAddress}:${session.remotePort}`);
  });

  // const _mailFrom = session.envelope?.mailFrom;
  stream.on('end', async () => {
    // console.log(`Completed message reception: ${chunklen} bytes`, {
    //   id: session.id,
    //   from: mailFrom !== false ? mailFrom.address : undefined,
    //   to: session.envelope?.rcptTo?.map(r => r.address),
    //   client: `${session.clientHostname} [${session.remoteAddress}]`,
    //   secure: session.secure
    // });
    
    try {
      const fullEmail = new TextDecoder().decode(
        new Uint8Array(chunks.flatMap(chunk => Array.from(chunk)))
      );
      
      // Parse the email content
      const _parsedEmail = await parseEmail(fullEmail);
      // console.log('Successfully parsed DMARC report:', {
      //   sessionId: session.id,
      //   reportId: parsedEmail?.reportMetadata?.reportId,
      //   transmissionType: session.transmissionType
      // });
      
      // Successfully processed
      callback();
      
    } catch (error) {
      console.error('Error processing email:', {
        sessionId: session.id,
        error,
        clientHostname: session.clientHostname,
        transmissionType: session.transmissionType
      });
      callback(new Error('Failed to process email'));
    }
  });

  stream.on('error', (error: Error) => {
    console.error('Stream error:', {
      sessionId: session.id,
      error,
      clientHostname: session.clientHostname
    });
    callback(error);
  });
} 