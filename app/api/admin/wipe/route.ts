import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const BUCKET_NAME = "pendaftar-files";
const LIST_LIMIT = 1000;
const REMOVE_BATCH_SIZE = 100;

async function listAllFiles(prefix: string): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(prefix, { limit: LIST_LIMIT, offset });

    if (error) {
      throw new Error(
        `Storage list failed at "${prefix || "/"}": ${error.message}`
      );
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.metadata) {
        files.push(itemPath);
      } else {
        const nestedFiles = await listAllFiles(itemPath);
        files.push(...nestedFiles);
      }
    }

    if (data.length < LIST_LIMIT) {
      break;
    }

    offset += LIST_LIMIT;
  }

  return files;
}

async function removeFilesInBatches(paths: string[]): Promise<number> {
  if (paths.length === 0) {
    return 0;
  }

  let deleted = 0;

  for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(i, i + REMOVE_BATCH_SIZE);
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove(batch);

    if (error) {
      throw new Error(`Storage remove failed: ${error.message}`);
    }

    deleted += data?.length ?? batch.length;
  }

  return deleted;
}

export async function POST(request: Request) {
  const adminToken = process.env.ADMIN_WIPE_TOKEN;
  const providedToken = request.headers.get("x-admin-token");

  if (!adminToken || providedToken !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  try {
    // Example:
    // curl -X POST http://localhost:3000/api/admin/wipe -H "x-admin-token: <token>"
    const filePaths = await listAllFiles("");
    const deletedFiles = await removeFilesInBatches(filePaths);

    const { error: rpcError } = await supabaseAdmin.rpc("admin_wipe_db");
    if (rpcError) {
      return NextResponse.json(
        { error: `Database wipe failed: ${rpcError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      storage: { bucket: BUCKET_NAME, deletedFiles },
      db: { truncated: true },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
