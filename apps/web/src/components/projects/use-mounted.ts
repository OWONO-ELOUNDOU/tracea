import { useEffect, useRef } from "react";

/** Ref reading `false` once the component has unmounted, to skip updates after an await. */
export function useMounted() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
