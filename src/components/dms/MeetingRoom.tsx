import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  roomName: string;
  displayName: string;
  audioOnly?: boolean;
};

// Uses free public Jitsi Meet — no API key required. External domain.
export function MeetingRoom({ open, onClose, roomName, displayName, audioOnly }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const url = `https://meet.jit.si/${encodeURIComponent(roomName)}#userInfo.displayName="${encodeURIComponent(displayName)}"${audioOnly ? "&config.startAudioOnly=true" : ""}`;

  useEffect(() => {
    if (!open) return;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">Live meeting · {roomName}</DialogTitle>
        </DialogHeader>
        <iframe
          ref={ref}
          src={url}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          title="Live meeting"
        />
      </DialogContent>
    </Dialog>
  );
}
