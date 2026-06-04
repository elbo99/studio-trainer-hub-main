import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiProps {
  trigger: boolean;
}

export function Confetti({ trigger }: ConfettiProps) {
  useEffect(() => {
    if (trigger) {
      // First burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#aecae8", "#ffd700", "#ff6b6b", "#4ecdc4", "#a855f7"],
      });

      // Second burst after a small delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#aecae8", "#ffd700", "#ff6b6b"],
        });
      }, 150);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#4ecdc4", "#a855f7", "#aecae8"],
        });
      }, 300);
    }
  }, [trigger]);

  return null;
}
