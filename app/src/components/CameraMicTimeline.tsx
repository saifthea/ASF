import { CameraMicEvent } from '../adapters/CameraMicAdapter';

interface Props {
  data: CameraMicEvent[];
}

export default function CameraMicTimeline({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No camera/microphone access events found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Package</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Resource</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Timestamp</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Status</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">AppOp</th>
          </tr>
        </thead>
        <tbody>
          {data.map((event, idx) => (
            <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 px-3 text-white">{event.packageName}</td>
              <td className="py-2 px-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                  event.resource === 'camera'
                    ? 'bg-red-900/50 text-red-300'
                    : 'bg-blue-900/50 text-blue-300'
                }`}>
                  {event.resource}
                </span>
              </td>
              <td className="py-2 px-3 text-gray-400 font-mono text-xs">
                {new Date(event.timestamp).toLocaleString()}
              </td>
              <td className={`py-2 px-3 font-medium ${
                event.status === 'granted' ? 'text-green-400' :
                event.status === 'denied' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {event.status}
              </td>
              <td className="py-2 px-3 text-gray-400 text-xs">{event.appOp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}