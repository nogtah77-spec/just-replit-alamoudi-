import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // Always clearly visible — matches Input style exactly, 12px radius
      "flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md " +
      "border border-border bg-card px-3 py-2 " +
      "text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] " +
      "cursor-pointer transition-all duration-[180ms] ease-out " +
      "ring-offset-background data-[placeholder]:text-muted-foreground/60 " +
      "hover:border-ring/50 " +
      "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring " +
      "disabled:cursor-not-allowed disabled:opacity-50 " +
      "[&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-40 shrink-0 ml-2" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

// ── أزرار scroll مخصصة بسرعة متحكم بها (بديل عن Radix ScrollButtons السريعة) ──
function SlowScrollButton({ direction }: { direction: "up" | "down" }) {
  const btnRef = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startScroll = () => {
    const viewport = btnRef.current?.parentElement?.querySelector(
      "[data-radix-select-viewport]"
    ) as HTMLElement | null;
    if (!viewport) return;
    timer.current = setInterval(() => {
      viewport.scrollTop += direction === "down" ? 6 : -6;
    }, 50);
  };

  const stopScroll = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  };

  return (
    <div
      ref={btnRef}
      onMouseEnter={startScroll}
      onMouseLeave={stopScroll}
      className={cn(
        "flex cursor-default items-center justify-center py-1.5 select-none",
        "text-muted-foreground hover:text-foreground bg-popover transition-colors",
        direction === "up" ? "border-b border-border/40" : "border-t border-border/40"
      )}
    >
      {direction === "up"
        ? <ChevronUp className="h-4 w-4" />
        : <ChevronDown className="h-4 w-4" />}
    </div>
  );
}

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        // Floating premium menu — clean rounded corners, smooth shadow
        "relative z-50 max-h-64 sm:max-h-72 min-w-[8rem] " +
        "overflow-hidden rounded-xl " +
        "border border-border/80 bg-popover text-popover-foreground " +
        "shadow-[0_12px_36px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.06)] " +
        "duration-[180ms] " +
        "data-[state=open]:animate-in data-[state=closed]:animate-out " +
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 " +
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 " +
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 " +
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 " +
        "origin-[--radix-select-content-transform-origin]",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1.5 overflow-y-auto max-h-60 sm:max-h-64",
          position === "popper" &&
            "w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-2 pr-8 " +
      "text-sm font-medium outline-none transition-colors duration-[120ms] " +
      "text-popover-foreground " +
      "hover:bg-accent/15 hover:text-foreground " +
      "focus:bg-accent/15 focus:text-foreground " +
      "data-[highlighted]:bg-accent/15 data-[highlighted]:text-foreground " +
      "data-[state=checked]:font-bold data-[state=checked]:text-accent " +
      "data-[state=checked]:data-[highlighted]:bg-accent/20 data-[state=checked]:data-[highlighted]:text-accent " +
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-accent stroke-[2.5]" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select, SelectGroup, SelectValue, SelectTrigger, SelectContent,
  SelectLabel, SelectItem, SelectSeparator,
  SelectScrollUpButton, SelectScrollDownButton,
}
