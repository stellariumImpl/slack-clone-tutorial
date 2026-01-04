import { JSX, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const useConfirm = (
  title: string,
  message: string
): [() => JSX.Element, () => Promise<unknown>] => {
  const [promise, setPromise] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = () => {
    return new Promise<boolean>((resolve, reject) => {
      setPromise({ resolve });
    });
  };

  const handleClose = () => {
    setPromise(null);
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const ConfirmDialog = () => {
    return (
      <Dialog open={promise !== null} onOpenChange={handleCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
            {/* <DialogClose /> */}
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="cursor-pointer">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return [ConfirmDialog, confirm];
};
