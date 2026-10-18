import assert from "node:assert/strict";
import test from "node:test";
import { gunzipSync, gzipSync } from "node:zlib";
import {
  prepareTgsDocumentUpload,
  replyWithTgsDocument,
  TGS_DOCUMENT_FILE_NAME,
} from "../dist/logic/tgsDocument.js";

test("document cache bust changes only gzip header metadata", () => {
  const json = Buffer.from('{"v":"5.7.4"}');
  const tgs = gzipSync(json);
  const upload = prepareTgsDocumentUpload(tgs, 0x12345678);

  assert.notDeepEqual(upload, tgs);
  assert.deepEqual(gunzipSync(upload), json);
  assert.equal(upload.readUInt32LE(4), 0x12345678);
});

test("TGS document upload always has a Telegram-friendly filename", async () => {
  const json = Buffer.from('{"v":"5.7.4"}');
  const payload = gzipSync(json);
  let capturedFile;
  let capturedOptions;
  const expectedMessage = { message_id: 1 };
  const ctx = {
    replyWithDocument(file, options) {
      capturedFile = file;
      capturedOptions = options;
      return Promise.resolve(expectedMessage);
    },
  };

  const result = await replyWithTgsDocument(ctx, payload, "caption");

  assert.equal(result, expectedMessage);
  assert.equal(capturedFile.filename, TGS_DOCUMENT_FILE_NAME);
  assert.equal(capturedFile.filename, "sticker.tgs");
  const uploadedPayload = Buffer.from(await capturedFile.toRaw());
  assert.notDeepEqual(uploadedPayload, payload);
  assert.deepEqual(gunzipSync(uploadedPayload), json);
  assert.deepEqual(capturedOptions, {
    caption: "caption",
  });
});
