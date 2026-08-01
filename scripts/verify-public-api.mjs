import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
let id = "";
let deleteToken = "";

try {
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  assert.equal((await fetch(`${base}/api/auth`)).status, 404);

  const form = new FormData();
  const fixture = await readFile(path.resolve("tests/fixtures/sample.epub"));
  form.set("file", new Blob([fixture], { type: "application/epub+zip" }), `public-api-${Date.now()}.epub`);
  const uploadResponse = await fetch(`${base}/api/books`, { method: "POST", body: form });
  assert.equal(uploadResponse.status, 201);
  const upload = await uploadResponse.json();
  id = upload.book?.id || "";
  deleteToken = upload.deleteToken || "";
  assert.ok(id && deleteToken, "Upload must return a book id and an anonymous deletion token");

  const libraryResponse = await fetch(`${base}/api/books`);
  assert.equal(libraryResponse.status, 200);
  const library = await libraryResponse.json();
  const publicBook = library.books.find((book) => book.id === id);
  assert.ok(publicBook, "Uploaded book must appear in the public library");
  for (const privateField of ["originalName", "storedName", "deleteTokenHash"]) {
    assert.equal(privateField in publicBook, false, `${privateField} must stay private`);
  }

  assert.equal((await fetch(`${base}/api/books/${id}/file`)).status, 200);
  assert.equal(
    (await fetch(`${base}/api/books/${id}`, { method: "DELETE", headers: { "x-delete-token": "wrong" } })).status,
    403,
  );

  const aiResponse = await fetch(`${base}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "用一句话概括", context: "阅读的目标是理解并形成自己的判断。", scope: "selection" }),
  });
  assert.equal(aiResponse.status, 200);
  assert.ok((await aiResponse.text()).length > 20, "AI response must contain streamed text");

  const deleteResponse = await fetch(`${base}/api/books/${id}`, {
    method: "DELETE",
    headers: { "x-delete-token": deleteToken },
  });
  assert.equal(deleteResponse.status, 200);
  id = "";
  console.log(`PUBLIC_API_OK base=${base} auth_route=404 wrong_delete=403 owner_delete=200`);
} finally {
  if (id && deleteToken) {
    await fetch(`${base}/api/books/${id}`, {
      method: "DELETE",
      headers: { "x-delete-token": deleteToken },
    }).catch(() => undefined);
  }
}
