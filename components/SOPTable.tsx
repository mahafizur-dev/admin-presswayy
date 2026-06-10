"use client";

import React, { useState } from "react";
import { SOPFormData } from "../lib/sopSchema";

export default function SOPTable({ data }: { data: SOPFormData[] }) {
  // Ensure we are working with an array
  const tableData = Array.isArray(data) ? data : [];

  if (tableData.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        কোনো ডেটা পাওয়া যায়নি।
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
          <tr>
            <th className="px-6 py-4">Business Name</th>
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableData.map((record) => (
            <tr key={record.companyId} className="hover:bg-slate-50">
              <td className="px-6 py-4">{record.businessName}</td>
              <td className="px-6 py-4">{record.businessType}</td>
              <td className="px-6 py-4">Edit</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
