import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      gap={10}
      style={{ "--width": "min(24rem, calc(100vw - 1.5rem))" } as React.CSSProperties}
      toastOptions={{
        classNames: {
          toast:
            "group toast will-change-transform group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border/70 group-[.toaster]:shadow-lg dark:group-[.toaster]:border-transparent dark:group-[.toaster]:bg-card",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
