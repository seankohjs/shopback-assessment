export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-24">
      <div className="z-10 items-center justify-between w-full max-w-5xl font-mono text-sm">
        <h1 className="mb-8 text-4xl font-bold">Delivery Slot Service</h1>
        
        <div className="p-4 mb-8 border rounded-lg bg-gray-50">
          <h2 className="mb-2 text-xl font-semibold">API Endpoints:</h2>
          <ul className="pl-5 list-disc">
            <li><code>/api/order/create</code> - Create a new order</li>
            <li><code>/api/order/[id]</code> - Get order by ID</li>
            <li><code>/api/order/user/[userId]</code> - Get user orders</li>
            <li><code>/api/admin/slots</code> - Admin view of delivery slots</li>
            <li><code>/api/admin/risk-alerts</code> - Admin view of risk alerts</li>
          </ul>
        </div>
        
        <p className="text-gray-600">
          Backend service for order management with user-selected delivery time windows.
        </p>
      </div>
    </main>
  );
} 