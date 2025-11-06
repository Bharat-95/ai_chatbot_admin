// components/JsonViewer.tsx
export default function JsonViewer({
  data,
  level = 0,
}: {
  data: any;
  level?: number;
}) {
  if (typeof data !== "object" || data === null) {
    return <span className="text-gray-700">{String(data)}</span>;
  }

  return (
    <div
      className={`space-y-2 ${
        level > 0 ? "border-l pl-4 ml-2 border-gray-200" : ""
      }`}
    >
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <div className="text-sm font-medium text-gray-800">{key}:</div>
          {typeof value === "object" && value !== null ? (
            <JsonViewer data={value} level={level + 1} />
          ) : (
            <div className="text-sm text-gray-600 ml-2">
              {String(value || "—")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
