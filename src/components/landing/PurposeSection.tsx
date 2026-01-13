"use client";

import Image from "next/image";

export function PurposeSection() {
  return (
    <section className="relative mx-auto mt-16 max-w-screen-xl lg:mt-32 lg:px-4">
      <div className="bg-gradient-to-b from-black to-black/20 px-4 py-14 lg:rounded-lg">
        <div className="mx-auto max-w-2xl text-center text-xl">
          <div className="text-base uppercase">The purpose behind Valyxo</div>
          <p className="mt-4 text-pretty">
            We built Valyxo because we know where founders create the most value:
            <br />
            building products and moving the company forward.
          </p>
          <p className="mt-12 text-pretty">
            Too much time is still spent chasing numbers across tools, documents, and spreadsheets.
            <br />
            Time that should be spent building.
          </p>
          <p className="mt-12 text-pretty">
            Founders need clarity, not complexity.
            <br />
            An easy way to stay in control of numbers and share them with confidence.
          </p>
          <div className="mx-auto mt-6 mb-3 flex items-center justify-center gap-6 flex-wrap" aria-label="Founder signatures">
            <Image
              src="/assets/signature-david-white.png"
              alt="Signature of David Sannes"
              width={200}
              height={60}
              className="max-w-[42vw] h-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <Image
              src="/assets/signature-farax-white.png"
              alt="Signature of Farax Farah"
              width={200}
              height={60}
              className="max-w-[42vw] h-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="mt-2">David Sannes & Farax Farah</div>
        </div>
      </div>
    </section>
  );
}
