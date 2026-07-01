"use client";

import React, { useEffect } from "react";
import { useSOPForm } from "../hooks/useSOPForm";
import { useCustomFields } from "../hooks/useCustomFields";
import { useSopStore } from "../store/useSopStore";
import { FormHeader } from "./sop/FormHeader";
import { FormFooter } from "./sop/FormFooter";
import { FormDialogs } from "./sop/FormDialogsContainer";
import { SectionRenderer } from "./sop/SectionRenderer";
import { CustomFieldsSection } from "./sop/CustomFieldsSection";
import { OrderFieldsManager } from "./sop/OrderFieldsManager";

interface SOPFormProps {
  companyId?: string;
}

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-slate-500">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    <p className="text-sm">লোড হচ্ছে...</p>
  </div>
);

export default function SOPForm({ companyId }: SOPFormProps) {
  const { isFetching } = useSopStore();

  const {
    form,
    values,
    isExisting,
    isVisible,
    completion,
    groups,
    missingFields,
    setMissingFields,
    showSuccessPopup,
    setShowSuccessPopup,
    successAction,
    onSubmit,
    onInvalid,
    status,
    errorMessage,
  } = useSOPForm(companyId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const customFieldsApi = useCustomFields();
  const {
    customFields,
    newLabel,
    setNewLabel,
    newType,
    setNewType,
    add,
    remove,
    updateValue,
  } = customFieldsApi;

  // effectiveCompanyId: prop takes priority, then typed companyId from form
  const effectiveCompanyId = companyId || values.companyId || "";

  // service ব্যবসায় অর্ডার সেকশনটি Lead Collection হিসেবে দেখাবে
  const isService = values.businessType === "service";

  if (isFetching) return <LoadingState />;

  return (
    <div className="flex flex-col">
      <FormHeader
        isExisting={isExisting}
        filled={completion.filled}
        total={completion.total}
        pct={completion.pct}
      />

      {status === "error" && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <span className="mt-0.5">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit(
          (data) => onSubmit(data, customFields),
          onInvalid,
        )}
        className="px-6 py-6"
        noValidate
      >
        <div className="space-y-6">
          {groups.map((group) => {
            const visibleFields = group.fields.filter(isVisible);
            const isOrderGroup = group.title === "অর্ডার ও প্রাইসিং";
            if (visibleFields.length === 0 && !isOrderGroup) return null;

            // service হলে অর্ডার সেকশনের টাইটেল Lead Collection
            const sectionTitle =
              isOrderGroup && isService ? "Lead Collection" : group.title;

            return (
              <SectionRenderer
                key={group.title}
                title={sectionTitle}
                fields={group.fields}
                isVisible={isVisible}
                register={register}
                errors={errors}
              >
                {isOrderGroup && (
                  <OrderFieldsManager
                    companyId={effectiveCompanyId}
                    businessType={values.businessType}
                  />
                )}
              </SectionRenderer>
            );
          })}

          <CustomFieldsSection
            customFields={customFields}
            newLabel={newLabel}
            setNewLabel={setNewLabel}
            newType={newType}
            setNewType={setNewType}
            onAdd={add}
            onRemove={remove}
            onUpdateValue={updateValue}
          />
        </div>

        <FormFooter
          isExisting={isExisting}
          pct={completion.pct}
          isSubmitting={status === "submitting"}
        />
      </form>

      <FormDialogs
        missingFields={missingFields}
        onCloseMissing={() => setMissingFields([])}
        showSuccess={showSuccessPopup}
        successAction={successAction}
        onCloseSuccess={() => setShowSuccessPopup(false)}
      />
    </div>
  );
}
