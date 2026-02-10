import { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Props = {
  params: Promise<{ token: string }>;
};

async function getCompanyMetadata(token: string) {
  try {
    // 1) Find investor_link
    const { data: linkRow, error: linkError } = await supabaseAdmin
      .from("investor_links")
      .select("company_id, expires_at")
      .eq("access_token", token)
      .maybeSingle();

    if (linkError || !linkRow) {
      return null;
    }

    // 2) Check expiry
    if (linkRow.expires_at && new Date(linkRow.expires_at).getTime() < Date.now()) {
      return null;
    }

    const companyId = linkRow.company_id as string | null;
    if (!companyId) {
      return null;
    }

    // 3) Fetch company (only safe fields for metadata)
    const { data: companyRow, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("name, logo_url, industry, stage, profile_published")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !companyRow || !companyRow.profile_published) {
      return null;
    }

    return {
      name: companyRow.name,
      logoUrl: companyRow.logo_url as string | null,
    };
  } catch (error) {
    console.error("[investor layout] Error fetching company metadata:", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { token } = await params;
    const company = await getCompanyMetadata(token);

    const baseUrl = "https://www.valyxo.com";
    const defaultImage = `${baseUrl}/og/valyxo-og.jpg`;

    // Fallback to default Valyxo metadata if company not found
    if (!company) {
      return {
        title: "Valyxo — Stop explaining your numbers",
        description: "Connect your systems. Get live metrics — built for startups raising capital.",
        openGraph: {
          title: "Valyxo — Stop explaining your numbers",
          description: "Connect your systems. Get live metrics — built for startups raising capital.",
          images: [
            {
              url: defaultImage,
              width: 1200,
              height: 630,
              alt: "Valyxo",
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title: "Valyxo — Stop explaining your numbers",
          description: "Connect your systems. Get live metrics — built for startups raising capital.",
          images: [defaultImage],
        },
      };
    }

    // Company-specific metadata
    const companyName = company.name || "Company";
    const ogImage = company.logoUrl && company.logoUrl.startsWith("http")
      ? company.logoUrl
      : defaultImage;

    return {
      title: `${companyName} — Investor Overview | Valyxo`,
      description: "Live KPIs, monthly snapshots, and clean investor updates. Share one link.",
      openGraph: {
        siteName: "Valyxo",
        type: "website",
        url: `${baseUrl}/investor/${token}`,
        title: `${companyName} — Investor Overview | Valyxo`,
        description: "Live KPIs, monthly snapshots, and clean investor updates. Share one link.",
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: companyName,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        site: "@valyxo",
        creator: "@valyxo",
        title: `${companyName} — Investor Overview | Valyxo`,
        description: "Live KPIs, monthly snapshots, and clean investor updates. Share one link.",
        images: [ogImage],
      },
    };
  } catch (error) {
    console.error("[investor layout] Error generating metadata:", error);
    // Return safe fallback metadata
    const baseUrl = "https://www.valyxo.com";
    const defaultImage = `${baseUrl}/og/valyxo-og.jpg`;
    return {
      title: "Valyxo — Stop explaining your numbers",
      description: "Connect your systems. Get live metrics — built for startups raising capital.",
      openGraph: {
        title: "Valyxo — Stop explaining your numbers",
        description: "Connect your systems. Get live metrics — built for startups raising capital.",
        images: [
          {
            url: defaultImage,
            width: 1200,
            height: 630,
            alt: "Valyxo",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Valyxo — Stop explaining your numbers",
        description: "Connect your systems. Get live metrics — built for startups raising capital.",
        images: [defaultImage],
      },
    };
  }
}

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
