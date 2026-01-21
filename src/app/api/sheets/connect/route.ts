import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { companyId, sheetUrl, tabName, sheets } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "Missing companyId" },
        { status: 400 }
      );
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json(
        { error: "Invalid companyId format (must be UUID)" },
        { status: 400 }
      );
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      console.error("[api/sheets/connect] Database error:", companyError);
      return NextResponse.json(
        { error: "Failed to verify company", details: companyError.message },
        { status: 500 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Support both old format (single sheet) and new format (array of sheets)
    let updateData: any = {};

    if (sheets && Array.isArray(sheets) && sheets.length > 0) {
      // New format: multiple sheets stored as JSON array
      const sheetsArray = sheets.map((s: any) => ({
        url: s.url?.trim() || "",
        tab: s.tab?.trim() || "",
      })).filter((s: any) => s.url);

      if (sheetsArray.length === 0) {
        return NextResponse.json(
          { error: "At least one valid sheet URL is required" },
          { status: 400 }
        );
      }

      // Store as JSON string in google_sheets_url column
      // For backward compatibility, also set the first sheet's tab in google_sheets_tab
      updateData.google_sheets_url = JSON.stringify(sheetsArray);
      updateData.google_sheets_tab = sheetsArray[0].tab || null;
    } else if (sheetUrl && typeof sheetUrl === "string") {
      // Old format: single sheet (backward compatibility)
      updateData.google_sheets_url = sheetUrl.trim();
      if (tabName && typeof tabName === "string" && tabName.trim()) {
        updateData.google_sheets_tab = tabName.trim();
      } else {
        updateData.google_sheets_tab = null;
      }
    } else {
      return NextResponse.json(
        { error: "Missing or invalid sheetUrl or sheets array" },
        { status: 400 }
      );
    }

    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from("companies")
      .update(updateData)
      .eq("id", companyId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("[api/sheets/connect] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save Google Sheets configuration", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        company: updatedCompany,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[api/sheets/connect] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

