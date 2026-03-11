'use client';

import Image from 'next/image';

interface InstallCodeRevealProps {
  showCode: boolean;
}

export default function InstallCodeReveal({ showCode }: InstallCodeRevealProps) {
  return (
    <div className="absolute right-0 top-0 w-[860px] h-[860px] pointer-events-none">{/* Removed buttons, just the visual display */}

      {/* Musashi Image (default) */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          showCode ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="relative w-full h-full bg-black">
          <Image
            src="/images/generated-1771830449125.png"
            alt="Miyamoto Musashi"
            fill
            className="object-cover object-right opacity-65"
            priority
            unoptimized
          />
          {/* Your existing market overlays... */}
        </div>
      </div>

      {/* Code Block (shown on Install click) */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          showCode ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full h-full bg-[#0a0a0a] p-12 overflow-auto">
          {/* API Endpoints Table */}
          <div className="mb-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#333]">
                  <th className="font-jetbrains text-white text-sm font-bold pb-3">Endpoint</th>
                  <th className="font-jetbrains text-white text-sm font-bold pb-3">Expected Response Time</th>
                  <th className="font-jetbrains text-white text-sm font-bold pb-3">Notes</th>
                </tr>
              </thead>
              <tbody className="font-jetbrains text-[13px]">
                <tr className="border-b border-[#222]">
                  <td className="py-3 text-[#ddd]">/api/health</td>
                  <td className="py-3 text-[#ddd]">&lt; 500ms</td>
                  <td className="py-3 text-[#888]">Cold start: ~2s</td>
                </tr>
                <tr className="border-b border-[#222]">
                  <td className="py-3 text-[#ddd]">/api/analyze-text</td>
                  <td className="py-3 text-[#ddd]">&lt; 200ms</td>
                  <td className="py-3 text-[#888]">With cached markets</td>
                </tr>
                <tr className="border-b border-[#222]">
                  <td className="py-3 text-[#ddd]">/api/markets/arbitrage</td>
                  <td className="py-3 text-[#ddd]">&lt; 1s</td>
                  <td className="py-3 text-[#888]">First request slower (cache miss)</td>
                </tr>
                <tr className="border-b border-[#222]">
                  <td className="py-3 text-[#ddd]">/api/markets/movers</td>
                  <td className="py-3 text-[#ddd]">&lt; 500ms</td>
                  <td className="py-3 text-[#888]">Requires price history</td>
                </tr>
                <tr className="border-b border-[#222]">
                  <td className="py-3 text-[#ddd]">/api/feed</td>
                  <td className="py-3 text-[#ddd]">&lt; 200ms</td>
                  <td className="py-3 text-[#888]">Returns from KV</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* How to Test */}
          <div>
            <h3 className="font-jetbrains text-white text-base font-bold mb-4">How to Test:</h3>
            <div className="bg-[#111] border border-[#222] rounded p-4">
              <pre className="font-mono text-[13px] leading-relaxed">
                <code>
                  <div className="text-[#6a9955]"># Add -w to see response time</div>
                  <div className="text-[#ddd]">curl -w <span className="text-[#ce9178]">"\nTime: %{'{'}time_total{'}'}\n"</span> <span className="text-[#ce9178]">"https://musashi-api.vercel.app/api/health"</span></div>
                  <div className="mt-3"></div>
                  <div className="text-[#ddd]">curl -i https://musashi-api.vercel.app/api/health</div>
                  <div className="text-[#ddd]">curl -i <span className="text-[#ce9178]">"https://musashi-api.vercel.app/api/feed?limit=5"</span></div>
                  <div className="text-[#ddd]">curl -i https://musashi-api.vercel.app/api/feed/stats</div>
                  <div className="text-[#ddd]">curl -i <span className="text-[#ce9178]">"https://musashi-api.vercel.app/api/markets/arbitrage?minSpread=0.05"</span></div>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
