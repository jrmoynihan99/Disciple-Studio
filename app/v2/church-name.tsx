"use client";

import { createContext, useContext, useEffect, useState } from "react";

/* The mirror section asks the visitor to write their church's name;
   chapter five, the offer, and the final CTA all wear it afterwards.
   Persisted to localStorage so it survives a reload. */

const KEY = "v2-church-name";

const Ctx = createContext<{
  name: string;
  setName: (v: string) => void;
}>({ name: "", setName: () => {} });

export function ChurchNameProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    try {
      setName(localStorage.getItem(KEY) || "");
    } catch {}
  }, []);
  const set = (v: string) => {
    setName(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  };
  return <Ctx.Provider value={{ name, setName: set }}>{children}</Ctx.Provider>;
}

export const useChurchName = () => useContext(Ctx);
