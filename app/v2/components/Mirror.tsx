"use client";

import { V2 } from "@/app/v2/data";
import { useChurchName } from "@/app/v2/church-name";
import { Kicker } from "@/app/v2/components/ui";

export default function Mirror() {
  const m = V2.mirror;
  const { name, setName } = useChurchName();
  return (
    <section className="pt-[104px] text-center">
      <Kicker>{m.kicker}</Kicker>
      <div className="mx-auto mt-6 flex max-w-[560px] flex-col gap-3.5 px-6">
        {m.lines.map((l, i) => (
          <p
            key={i}
            className="text-balance text-[21px] italic leading-[1.5] text-nb-soft"
          >
            {l}
          </p>
        ))}
      </div>
      <div className="mt-8 -rotate-[1.5deg] font-nb-hand text-[31px] text-nb-red">
        {m.was}
      </div>
      <div className="mt-10 px-6">
        <label className="mb-2.5 block -rotate-[0.8deg] font-nb-hand text-2xl text-nb-tan">
          {m.inputLabel}
        </label>
        <input
          value={name}
          placeholder={m.placeholder}
          onChange={(e) => setName(e.target.value)}
          className="w-[340px] max-w-full -rotate-1 border-0 border-b-[3px] border-dashed border-nb-ink/35 bg-transparent px-2.5 pb-1.5 pt-0.5 text-center font-nb-hand text-[33px] text-nb-ink outline-none placeholder:text-nb-ink/30 focus:border-nb-red"
        />
        {name.trim() ? (
          <p className="mx-auto mt-5 max-w-[420px] text-[16.5px] italic text-nb-muted">
            {m.note}
          </p>
        ) : null}
      </div>
    </section>
  );
}
