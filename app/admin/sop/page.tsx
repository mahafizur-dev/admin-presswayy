import SOPTable from "@/components/SOPTable";

async function getSops() {
  try {
    const response = await fetch(
      "https://server.presswayy.com/webhook/api/v1/get-sop-form",
      { cache: "no-store" },
    );

    if (!response.ok) {
      console.error("API Response not OK:", response.status);
      return [];
    }

    const data = await response.json();

    // Ensure the data is always an array before returning
    return Array.isArray(data) ? data : data ? [data] : [];
  } catch (error) {
    console.error("Fetch failed:", error);
    return []; // Return empty array on failure to prevent crash
  }
}

export default async function SOPPage() {
  const data = await getSops();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">SOP Records</h1>
      <SOPTable data={data} />
    </div>
  );
}
