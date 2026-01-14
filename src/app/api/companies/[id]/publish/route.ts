import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json({ error: "Missing company ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { is_published } = body;

    if (typeof is_published !== "boolean") {
      return NextResponse.json(
        { error: "is_published must be a boolean" },
        { status: 400 }
      );
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Update published status
    const now = new Date().toISOString();
    const updateData: any = {
      profile_published: is_published,
    };

    if (is_published) {
      updateData.published_at = now;
      updateData.published_by = "founder";
    } else {
      updateData.published_at = null;
      updateData.published_by = null;
    }

    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from("companies")
      .update(updateData)
      .eq("id", companyId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating publish status:", updateError);
      return NextResponse.json(
        { error: "Failed to update publish status", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      company: updatedCompany,
    });
  } catch (err: any) {
    console.error("Unexpected error in publish endpoint:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

