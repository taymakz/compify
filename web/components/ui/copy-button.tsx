"use client"

import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { Button } from "@/components/button"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { anchoredToastManager } from "@/components/toast"
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/components/tooltip"

type CopyButtonProps = {
  value: string
  label?: string
  size?: "icon" | "sm" | "default"
  variant?: "outline" | "ghost" | "default"
  className?: string
  disabled?: boolean
}

export function CopyButton({
  value,
  label = "کپی",
  size = "icon",
  variant = "outline",
  className,
  disabled = false,
}: CopyButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null)
  const toastTimeout = 2000

  const { copyToClipboard, isCopied } = useCopyToClipboard({
    timeout: toastTimeout,
    onCopy: () => {
      if (ref.current) {
        anchoredToastManager.add({
          title: "کپی شد!",
          timeout: toastTimeout,
          data: { tooltipStyle: true },
          positionerProps: { anchor: ref.current },
        })
      }
    },
  })

  function handleCopy() {
    copyToClipboard(value)
  }

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              ref={ref}
              onClick={handleCopy}
              size={size}
              variant={variant}
              aria-label={label}
              className={className}
              disabled={disabled}
            />
          }
        >
          {isCopied ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </TooltipTrigger>

        <TooltipPopup>
          <p>{label}</p>
        </TooltipPopup>
      </Tooltip>
    </div>
  )
}
