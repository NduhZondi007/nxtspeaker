import { Lock } from "lucide-react";

interface ChatLockedProps {
  reason?: string;
}

export function ChatLocked({ reason }: ChatLockedProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] py-12 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-warm-gray flex items-center justify-center mb-4">
        <Lock size={24} className="text-gold" />
      </div>
      <h3 className="font-cormorant text-xl font-semibold text-ink mb-2">
        Chat is Locked
      </h3>
      <p className="text-sm text-mid-gray max-w-xs leading-relaxed">
        {reason ?? "Chat unlocks once your booking request is accepted by the speaker."}
      </p>
    </div>
  );
}
