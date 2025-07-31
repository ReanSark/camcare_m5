// components/Alert.tsx
export const Alert = ({ message }: { message: string }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
    {message}
  </div>
);

// And use it inside the form like:
// {error && <Alert message={error} />}
