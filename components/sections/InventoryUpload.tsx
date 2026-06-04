"use client";

import React, { useState, useTransition } from "react";
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Download,
  Database,
  Cpu,
} from "lucide-react";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("csv");

  const WEBHOOK_URL = "https://server.presswayy.com/webhook/product-inventory";

  const handleDownloadSample = () => {
    const csvContent =
      "id,name,category,regular_price,offer_price,inventory_quantity,size,color,product_type,size_chart_image_url\n" +
      "101,Panjabi Semi Fit,Panjabi,2790,1950,100000,3B,Deep ash,3287#1,https://res.cloudinary.com/drchxbdit/image/upload/v1776054103/size_chart_panjabi_tmeusj.webp\n" +
      "102,Premium Shirt,Clothing,1500,1200,500,L,Blue,Casual,https://example.com/shirt-chart.png";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "product_inventory_sample.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadWordPressPlugin = () => {
    const phpContent = `<?php
/**
 * Plugin Name: Presswayy Inventory Sync
 * Description: Automatically syncs WooCommerce products to Presswayy Inventory Network.
 * Version: 1.0.0
 * Author: Presswayy
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

add_action( 'woocommerce_update_product', 'presswayy_sync_product_to_webhook', 10, 2 );
add_action( 'woocommerce_new_product', 'presswayy_sync_product_to_webhook', 10, 2 );

function presswayy_sync_product_to_webhook( $product_id, $product ) {
    $webhook_url = 'https://server.presswayy.com/webhook/product-inventory';
    $categories = wp_get_post_terms( $product_id, 'product_cat', array( 'fields' => 'names' ) );
    
    $payload = array(
        'id' => $product_id,
        'name' => $product->get_name(),
        'category' => ! empty( $categories ) ? implode( ', ', $categories ) : 'Uncategorized',
        'regular_price' => $product->get_regular_price(),
        'offer_price' => $product->get_sale_price() ? $product->get_sale_price() : $product->get_regular_price(),
        'inventory_quantity' => $product->get_stock_quantity() ? $product->get_stock_quantity() : 0,
        'product_type' => $product->get_type(),
        'image_url' => wp_get_attachment_url( $product->get_image_id() )
    );
    
    $temp_file = fopen('php://temp', 'r+');
    fputcsv($temp_file, array_keys($payload));
    fputcsv($temp_file, array_values($payload));
    rewind($temp_file);
    $csv_data = stream_get_contents($temp_file);
    fclose($temp_file);
    
    $boundary = wp_generate_password( 24 );
    $headers  = array('content-type' => 'multipart/form-data; boundary=' . $boundary);
    
    $payload_body = '--' . $boundary . "\\r\\n";
    $payload_body .= 'Content-Disposition: form-data; name="file"; filename="wp_product_' . $product_id . '.csv"' . "\\r\\n";
    $payload_body .= 'Content-Type: text/csv' . "\\r\\n\\r\\n";
    $payload_body .= $csv_data . "\\r\\n";
    $payload_body .= '--' . $boundary . '--';
    
    wp_remote_post( $webhook_url, array(
        'headers'     => $headers,
        'body'        => $payload_body,
        'timeout'     => 15,
        'blocking'    => false,
    ) );
}`;

    const blob = new Blob([phpContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "presswayy-inventory-sync.php");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv")
      ) {
        setFile(selectedFile);
        setStatus("idle");
        setUploadProgress(0);
        setErrorMessage("");
      } else {
        setStatus("error");
        setErrorMessage(
          "ভুল ফাইল ফরম্যাট। অনুগ্রহ করে শুধুমাত্র একটি স্ট্যান্ডার্ড CSV ফাইল সিলেক্ট করুন।",
        );
      }
    }
  };

  const uploadCSV = () => {
    if (!file) return;

    startTransition(async () => {
      setStatus("uploading");
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      try {
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setStatus("success");
              resolve(xhr.response);
            } else {
              setStatus("error");
              setErrorMessage(`সার্ভার রেসপন্স এরর কোড: ${xhr.status}`);
              reject();
            }
          });
          xhr.addEventListener("error", () => {
            reject();
          });
          xhr.open("POST", WEBHOOK_URL);
          xhr.send(formData);
        });
      } catch (err) {
        setStatus("error");
        setErrorMessage("নেটওয়ার্ক কানেকশন ব্যর্থ হয়েছে।");
      }
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden transition-all duration-300">
        <div className="p-8 space-y-6">
          <header className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">
              Sync Your Product Inventory
            </h2>
            <p className="text-sm text-slate-500">
              আপনার ডাটাবেজের সাথে প্রোডাক্ট ইনভেন্টরি সিঙ্ক করার উপযুক্ত
              মাধ্যমটি বেছে নিন।
            </p>
          </header>

          {/* ট্যাব সুইচার */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab("csv")}
              className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === "csv"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Database className="w-4 h-4" />
              ম্যানুয়াল CSV আপলোড
            </button>
            <button
              onClick={() => setActiveTab("wordpress")}
              className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === "wordpress"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Cpu className="w-4 h-4" />
              ওয়ার্ডপ্রেস অটো-সিঙ্ক
            </button>
          </div>

          {/* ট্যাব কনটেন্ট */}
          <div className="pt-2">
            {activeTab === "csv" ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100/60">
                  <div className="text-xs">
                    <p className="font-bold text-indigo-900">
                      টেমপ্লেট প্রয়োজন?
                    </p>
                    <p className="text-indigo-700/80">
                      স্ট্যান্ডার্ড ফরম্যাট ডাউনলোড করে ডাটা সাজান।
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSample}
                    className="flex items-center gap-2 text-xs font-bold bg-white text-indigo-600 px-4 py-2.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV টেমপ্লেট ডাউনলোড
                  </button>
                </div>

                <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/10 rounded-2xl p-10 text-center transition-all cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    disabled={status === "uploading"}
                  />
                  <div className="flex flex-col items-center">
                    {file ? (
                      <FileSpreadsheet className="w-12 h-12 text-emerald-500 mb-4 animate-bounce" />
                    ) : (
                      <Upload className="w-12 h-12 text-slate-300 group-hover:text-indigo-400 mb-4 transition-colors" />
                    )}
                    <p className="font-semibold text-slate-700">
                      {file
                        ? file.name
                        : "এখানে CSV ফাইল ড্র্যাগ করুন অথবা ব্রাউজ করুন"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      শুধুমাত্র স্ট্যান্ডার্ড .csv ফাইল সাপোর্টেড
                    </p>
                  </div>
                </div>

                {file && status !== "uploading" && (
                  <button
                    onClick={uploadCSV}
                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 cursor-pointer"
                  >
                    সার্ভারে আপলোড করুন
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800">
                        WooCommerce প্লাগইন অটো-সিঙ্ক
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        আপনার ওয়ার্ডপ্রেস সাইটে এটি ইনস্টল করলে ইনভেন্টরি
                        রিয়েল-টাইমে অটো-সিঙ্ক হবে।
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadWordPressPlugin}
                      className="shrink-0 flex items-center gap-2 text-xs font-bold bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      প্লাগইন ডাউনলোড করুন
                    </button>
                  </div>
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                    <h5 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      ইনস্টলেশন গাইড:
                    </h5>
                    <ul className="text-[11px] text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>ফাইলটি ডাউনলোড করে জিপ (ZIP) করুন।</li>
                      <li>
                        WordPress Admin &gt; Plugins &gt; Add New থেকে আপলোড
                        করুন।
                      </li>
                      <li>Activate বাটনে ক্লিক করে প্লাগইনটি সক্রিয় করুন।</li>
                      <li>
                        এখন থেকে যেকোনো WooCommerce প্রোডাক্ট পরিবর্তন আমাদের
                        সিস্টেমে অটোমেটিক চলে আসবে।
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* স্ট্যাটাস ও প্রগ্রেস বার */}
            <div className="mt-6">
              {status === "uploading" && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      ডাটাবেজে সিঙ্ক হচ্ছে...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {status === "success" && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 text-emerald-800 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">সাফল্যের সাথে সম্পন্ন হয়েছে!</p>
                    <p className="opacity-80">
                      আপনার ইনভেন্টরি আপডেট সফলভাবে প্রসেস করা হয়েছে।
                    </p>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 text-rose-800 animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">অপারেশন ব্যর্থ হয়েছে</p>
                    <p className="opacity-80">{errorMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
