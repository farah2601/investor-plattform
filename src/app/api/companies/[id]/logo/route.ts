import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg"];

/**
 * POST /api/companies/[id]/logo
 * Upload company logo to Supabase Storage
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    // Verify company exists
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPG, and SVG are allowed." },
        { status: 400 }
      );
    }

    // Get file extension
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf("."));
    
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: "Invalid file extension. Only .png, .jpg, .jpeg, .svg are allowed." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine storage path
    const storagePath = `${companyId}/logo${extension}`;

    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("company-logos")
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true, // Replace existing file if it exists
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        
        // Provide helpful error messages
        if (uploadError.message?.includes("bucket") || uploadError.message?.includes("not found")) {
          return NextResponse.json(
            { 
              error: "Storage bucket not found", 
              details: "The 'company-logos' bucket does not exist. Please create it in Supabase Storage settings. See SETUP_STORAGE.md for instructions." 
            },
            { status: 500 }
          );
        }
        
        if (uploadError.message?.includes("policy") || uploadError.message?.includes("permission")) {
          return NextResponse.json(
            { 
              error: "Storage permission denied", 
              details: "Storage policies are not configured correctly. Please run the SQL policies from SETUP_STORAGE.md" 
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json(
          { error: "Failed to upload file", details: uploadError.message },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from("company-logos")
        .getPublicUrl(storagePath);

      // Update company record with logo URL
      const { error: updateError } = await supabaseAdmin
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", companyId);

      if (updateError) {
        console.error("Error updating company logo_url:", updateError);
        
        // Provide helpful error messages based on error type
        let errorMessage = updateError.message;
        let details = "";
        
        if (updateError.message?.includes("column") || updateError.message?.includes("does not exist") || updateError.code === "42703") {
          errorMessage = "Database column not found";
          details = "The 'logo_url' column does not exist in the companies table. Please run the migration: supabase/migrations/20250116_add_company_branding.sql";
        } else if (updateError.message?.includes("permission") || updateError.message?.includes("policy")) {
          errorMessage = "Permission denied";
          details = "You don't have permission to update this company. Please check Row Level Security (RLS) policies.";
        }
        
        // Try to clean up uploaded file
        try {
          await supabaseAdmin.storage.from("company-logos").remove([storagePath]);
        } catch (cleanupError) {
          console.error("Failed to clean up uploaded file:", cleanupError);
        }
        
        return NextResponse.json(
          { error: "Failed to save logo URL", details: details || updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        logoUrl: publicUrl,
      });
    } catch (storageError: any) {
      console.error("Storage operation error:", storageError);
      return NextResponse.json(
        { error: "Storage operation failed", details: storageError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Unexpected error in POST logo:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[id]/logo
 * Remove company logo from Supabase Storage
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    // Verify company exists and get current logo URL
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, logo_url")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Extract storage path from logo_url if it exists
    if (company.logo_url) {
      try {
        // Extract path from URL (e.g., "https://...supabase.co/storage/v1/object/public/company-logos/{companyId}/logo.png")
        const urlParts = company.logo_url.split("/company-logos/");
        if (urlParts.length === 2) {
          const storagePath = urlParts[1];
          
          // Delete from storage
          const { error: deleteError } = await supabaseAdmin.storage
            .from("company-logos")
            .remove([storagePath]);

          if (deleteError) {
            console.error("Error deleting file from storage:", deleteError);
            // Continue anyway to update DB
          }
        }
      } catch (storageError) {
        console.error("Error processing storage deletion:", storageError);
        // Continue to update DB
      }
    }

    // Update company record to remove logo URL
    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({ logo_url: null })
      .eq("id", companyId);

    if (updateError) {
      console.error("Error removing logo_url:", updateError);
      return NextResponse.json(
        { error: "Failed to remove logo URL", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unexpected error in DELETE logo:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
