"use client";

import { MomentAmbRelacions } from "@/lib/utils";
import { useState } from "react";

type Props = {
  moment: MomentAmbRelacions;
  bucketPublicUrl: string;
};

export function MomentCard({ moment, bucketPublicUrl }: Props) {
  const [actiu, setActiu] = useState(0);
  const mitjans = moment.mitjans;

  if (mitjans.length === 0) {
    return (
      <div className="polaroid">
        <div className="aspect-[4/3] rounded bg-cream-100 grid place-items-center text-sepia-400">
          <span className="hand text-2xl">sense imatge</span>
        </div>
        <div className="text-center mt-3 hand text-lg">{moment.titol}</div>
      </div>
    );
  }

  const m = mitjans[actiu];
  const src = `${bucketPublicUrl}/${m.path}`;

  return (
    <div className="polaroid rotate-[-0.4deg]">
      <div className="relative aspect-[4/3] rounded overflow-hidden bg-sepia-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={moment.titol}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {mitjans.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mt-3 px-1">
          {mitjans.map((x, i) => (
            <button
              key={x.id}
              onClick={() => setActiu(i)}
              aria-label={`Veure mitjà ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition ${
                i === actiu ? "bg-accent-rose" : "bg-cream-200 hover:bg-cream-300"
              }`}
            />
          ))}
        </div>
      )}

      <div className="text-center mt-2 hand text-lg text-sepia-600">
        {moment.titol}
      </div>
    </div>
  );
}
