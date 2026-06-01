"use client"

import * as React from "react"

import { useIsMobile } from "@/hooks/use-media-query"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/drawer"

type ResponsiveDialogContextValue = {
  isDesktop: boolean
}

const ResponsiveDialogContext =
  React.createContext<ResponsiveDialogContextValue | null>(null)

function useResponsiveDialogContext() {
  const context = React.useContext(ResponsiveDialogContext)

  if (!context) {
    throw new Error(
      "ResponsiveDialog components must be used within <ResponsiveDialog>"
    )
  }

  return context
}

type ResponsiveDialogProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  drawerPosition?: "right" | "left" | "top" | "bottom"
}

function ResponsiveDialog({
  open,
  defaultOpen,
  onOpenChange,
  children,
  drawerPosition = "bottom",
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  const isDesktop = !isMobile

  return (
    <ResponsiveDialogContext.Provider value={{ isDesktop }}>
      {isDesktop ? (
        <Dialog
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
        >
          {children}
        </Dialog>
      ) : (
        <Drawer
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          position={drawerPosition}
        >
          {children}
        </Drawer>
      )}
    </ResponsiveDialogContext.Provider>
  )
}

type ResponsiveDialogTriggerProps =
  | React.ComponentProps<typeof DialogTrigger>
  | React.ComponentProps<typeof DrawerTrigger>

function ResponsiveDialogTrigger(props: ResponsiveDialogTriggerProps) {
  const { isDesktop } = useResponsiveDialogContext()

  return isDesktop ? (
    <DialogTrigger {...(props as React.ComponentProps<typeof DialogTrigger>)} />
  ) : (
    <DrawerTrigger {...(props as React.ComponentProps<typeof DrawerTrigger>)} />
  )
}

type ResponsiveDialogCloseProps =
  | React.ComponentProps<typeof DialogClose>
  | React.ComponentProps<typeof DrawerClose>

function ResponsiveDialogClose(props: ResponsiveDialogCloseProps) {
  const { isDesktop } = useResponsiveDialogContext()

  return isDesktop ? (
    <DialogClose {...(props as React.ComponentProps<typeof DialogClose>)} />
  ) : (
    <DrawerClose {...(props as React.ComponentProps<typeof DrawerClose>)} />
  )
}

type ResponsiveDialogPopupProps = Omit<
  React.ComponentProps<typeof DialogPopup>,
  "className"
> & {
  className?: React.ComponentProps<typeof DialogPopup>["className"]
  drawerClassName?: React.ComponentProps<typeof DrawerPopup>["className"]
}

function ResponsiveDialogPopup({
  className,
  drawerClassName,
  ...props
}: ResponsiveDialogPopupProps) {
  const { isDesktop } = useResponsiveDialogContext()

  if (isDesktop) {
    return (
      <DialogPopup
        {...(props as React.ComponentProps<typeof DialogPopup>)}
        className={className}
      />
    )
  }

  return (
    <DrawerPopup
      {...(props as React.ComponentProps<typeof DrawerPopup>)}
      className={drawerClassName}
    />
  )
}

type ResponsiveDialogPanelProps = Omit<
  React.ComponentProps<typeof DialogPanel>,
  "className"
> & {
  className?: React.ComponentProps<typeof DialogPanel>["className"]
  drawerClassName?: React.ComponentProps<typeof DrawerPanel>["className"]
}

function ResponsiveDialogPanel({
  className,
  drawerClassName,
  ...props
}: ResponsiveDialogPanelProps) {
  const { isDesktop } = useResponsiveDialogContext()

  if (isDesktop) {
    return (
      <DialogPanel
        {...(props as React.ComponentProps<typeof DialogPanel>)}
        className={className}
      />
    )
  }

  return (
    <DrawerPanel
      {...(props as React.ComponentProps<typeof DrawerPanel>)}
      className={drawerClassName}
    />
  )
}

type ResponsiveDialogHeaderProps = Omit<
  React.ComponentProps<typeof DialogHeader>,
  "className"
> & {
  className?: React.ComponentProps<typeof DialogHeader>["className"]
  drawerClassName?: React.ComponentProps<typeof DrawerHeader>["className"]
}

function ResponsiveDialogHeader({
  className,
  drawerClassName,
  ...props
}: ResponsiveDialogHeaderProps) {
  const { isDesktop } = useResponsiveDialogContext()

  if (isDesktop) {
    return (
      <DialogHeader
        {...(props as React.ComponentProps<typeof DialogHeader>)}
        className={className}
      />
    )
  }

  return (
    <DrawerHeader
      {...(props as React.ComponentProps<typeof DrawerHeader>)}
      className={drawerClassName}
    />
  )
}

type ResponsiveDialogFooterProps = Omit<
  React.ComponentProps<typeof DialogFooter>,
  "className"
> & {
  className?: React.ComponentProps<typeof DialogFooter>["className"]
  drawerClassName?: React.ComponentProps<typeof DrawerFooter>["className"]
}

function ResponsiveDialogFooter({
  className,
  drawerClassName,
  ...props
}: ResponsiveDialogFooterProps) {
  const { isDesktop } = useResponsiveDialogContext()

  if (isDesktop) {
    return (
      <DialogFooter
        {...(props as React.ComponentProps<typeof DialogFooter>)}
        className={className}
      />
    )
  }

  return (
    <DrawerFooter
      {...(props as React.ComponentProps<typeof DrawerFooter>)}
      className={drawerClassName}
    />
  )
}

type ResponsiveDialogTitleProps = Omit<
  React.ComponentProps<typeof DialogTitle>,
  "className"
> & {
  className?: React.ComponentProps<typeof DialogTitle>["className"]
  drawerClassName?: React.ComponentProps<typeof DrawerTitle>["className"]
}

function ResponsiveDialogTitle({
  className,
  drawerClassName,
  ...props
}: ResponsiveDialogTitleProps) {
  const { isDesktop } = useResponsiveDialogContext()

  if (isDesktop) {
    return (
      <DialogTitle
        {...(props as React.ComponentProps<typeof DialogTitle>)}
        className={className}
      />
    )
  }

  return (
    <DrawerTitle
      {...(props as React.ComponentProps<typeof DrawerTitle>)}
      className={drawerClassName}
    />
  )
}

type ResponsiveDialogDescriptionProps = Omit<
  React.ComponentProps<typeof DialogDescription>,
  "className"
> & {
  className?: React.ComponentProps<typeof DialogDescription>["className"]
  drawerClassName?: React.ComponentProps<typeof DrawerDescription>["className"]
}

function ResponsiveDialogDescription({
  className,
  drawerClassName,
  ...props
}: ResponsiveDialogDescriptionProps) {
  const { isDesktop } = useResponsiveDialogContext()

  if (isDesktop) {
    return (
      <DialogDescription
        {...(props as React.ComponentProps<typeof DialogDescription>)}
        className={className}
      />
    )
  }

  return (
    <DrawerDescription
      {...(props as React.ComponentProps<typeof DrawerDescription>)}
      className={drawerClassName}
    />
  )
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogPopup,
  ResponsiveDialogPanel,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
}
