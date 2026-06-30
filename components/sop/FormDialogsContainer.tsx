"use client";

import React from "react";
import { MissingFieldsPopup, SuccessPopup } from "./FormDialogs";

interface FormDialogsProps {
  missingFields: string[];
  onCloseMissing: () => void;
  showSuccess: boolean;
  successAction: "submit" | "update";
  onCloseSuccess: () => void;
}

export type { FormDialogsProps };

export function FormDialogs({
  missingFields,
  onCloseMissing,
  showSuccess,
  successAction,
  onCloseSuccess,
}: FormDialogsProps) {
  return (
    <>
      <MissingFieldsPopup fields={missingFields} onClose={onCloseMissing} />
      <SuccessPopup
        open={showSuccess}
        action={successAction}
        onClose={onCloseSuccess}
      />
    </>
  );
}
