import { useEffect, useRef } from "react";

import jazzicon from "@metamask/jazzicon";

export default function AddressAvatar({ address, size = 36 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !address) return;
    el.replaceChildren();
    const seed = parseInt(address.slice(2, 10), 16);
    const icon = jazzicon(size, seed);
    icon.style.borderRadius = "9999px";
    icon.style.display = "block";
    el.appendChild(icon);
  }, [address, size]);

  if (!address) {
    return <div className="inline-block h-9 w-9 rounded-full bg-white/10" style={{ width: size, height: size }} />;
  }

  return <span ref={ref} className="inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-white/10" style={{ width: size, height: size }} />;
}
