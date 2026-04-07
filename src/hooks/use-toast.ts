/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toast as sonnerToast } from "sonner";

export function useToast() {
  return {
    toast: ({ title, description, variant }: { title: string; description?: string; variant?: "default" | "destructive" }) => {
      if (variant === "destructive") {
        sonnerToast.error(title, { description });
      } else {
        sonnerToast.success(title, { description });
      }
    },
  };
}
