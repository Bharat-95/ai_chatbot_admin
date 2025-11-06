// components/Loader.tsx
export const Loader = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90">
      <div className="flex flex-col items-center">
        {/* Spinner */}
        <div className="relative h-16 w-16">
          <div className="absolute h-full w-full animate-spin rounded-full border-4 border-solid border-gray-300 border-t-blue-500"></div>
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-blue-500"></div>
        </div>

        {/* Text */}
        <p className="mt-4 text-lg font-medium text-gray-600">
          Please wait...
        </p>
      </div>
    </div>
  );
};