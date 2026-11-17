import { ConnectionLog } from '../adapters/NetworkTrafficAdapter';

interface Props {
  data: ConnectionLog[];
}

export default function TrafficGraph({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No traffic data available.</p>
      </div>
    );
  }

  const protocols = ['TCP', 'UDP'];
  const protocolColors: Record<string, string> = {
    TCP: '#3b82f6',
    UDP: '#f59e0b',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-6 text-sm">
        {protocols.map((p) => {
          const count = data.filter((c) => c.protocol === p).length;
          return (
            <div key={p} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: protocolColors[p] }}
              ></span>
              <span className="text-gray-300">
                {p}: <span className="text-white font-medium">{count}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Package</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Destination</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Port</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Protocol</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.map((conn, idx) => (
              <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2 px-3 text-white">{conn.packageName}</td>
                <td className="py-2 px-3 text-gray-300 font-mono text-xs">{conn.destinationIp}</td>
                <td className="py-2 px-3 text-gray-300">{conn.destinationPort}</td>
                <td className="py-2 px-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: `${protocolColors[conn.protocol]}22`,
                      color: protocolColors[conn.protocol],
                    }}
                  >
                    {conn.protocol}
                  </span>
                </td>
                <td className="py-2 px-3 text-white">{conn.connectionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}