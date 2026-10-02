import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster"
      toastOptions={{
        classNames: {
          toast: "border-line bg-white text-ink shadow-md",
          title: "text-ink",
          description: "text-muted",
          actionButton: "bg-pine text-cream",
          cancelButton: "bg-paper text-ink",
          error: "border-danger/30",
          success: "border-pine/30",
        },
      }}
      {...props}
    />
  );
}
