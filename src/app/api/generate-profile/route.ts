import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name: string = body.name ?? "This company";
    const industry: string = body.industry || "its market";
    const website: string = body.website_url || "their main website";
    const linkedinCount: number = Array.isArray(body.linkedin_urls)
      ? body.linkedin_urls.length
      : 0;

    const companyLabel = name || "this company";

    const problem = `${companyLabel} is operating in ${industry.toLowerCase()}, where operators still rely on fragmented tools and manual workflows to stay on top of KPIs, reporting and investor communication. This makes it hard to stay investor-ready at all times.`;

    const solution = `${companyLabel} offers a single, AI-first layer on top of existing finance and CRM systems. The product centralises KPIs, automates reporting and keeps an always-up-to-date investor profile that can be shared via a secure link.`;

    const why_now = `Investors demand real-time transparency, while modern SaaS companies are drowning in data from tools like Tripletex, Fiken and HubSpot. With AI-native tooling maturing, there is a narrow window to own the “always investor-ready” category in ${industry.toLowerCase()}.`;

    const market = `The initial beachhead is Nordic B2B SaaS companies with recurring revenue and external investors. Over time, the product can expand to a broader segment of digital-first companies that need automated KPI reporting and investor communication.`;

    const product_details = `The product connects to systems like accounting, CRM and spreadsheets, then lets an AI-agent maintain KPIs, generate narrative insights and keep a polished investor profile up to date. Founders can review and approve everything before it is shared with investors via a tokenised link.`;

    const teamSummary =
      linkedinCount > 0
        ? `The team has connected ${linkedinCount} LinkedIn profile(s), indicating a small but focused founding team with relevant experience.`
        : `The founding team has not yet connected LinkedIn profiles, but is positioned to execute on this opportunity with domain knowledge and proximity to early customers.`;

    return NextResponse.json({
      problem,
      solution,
      why_now,
      market,
      product_details,
      team_summary: teamSummary,
    });
  } catch (error) {
    console.error("Error in /api/generate-profile:", error);
    return NextResponse.json(
      { error: "Failed to generate profile" },
      { status: 500 }
    );
  }
}

