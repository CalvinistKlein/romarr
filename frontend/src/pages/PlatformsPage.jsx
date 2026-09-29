import React, { useState } from 'react';

export default function PlatformsPage({ platforms = [] }) {
  const [selectedManufacturer, setSelectedManufacturer] = useState('ALL');
  const manufacturers = ['ALL', 'Nintendo', 'Sony', 'Sega', 'Microsoft', 'Arcade', 'SNK', 'NEC'];

  const filteredPlatforms = platforms.filter(p => {
    if (selectedManufacturer !== 'ALL' && p.manufacturer !== selectedManufacturer) return false;
    return true;
  });

  return (
    <div className="space-y-4 text-xs">
      <div className="pb-3 border-b border-[#2d3238]">
        <h1 className="text-xl font-bold text-white">Consoles & Target Directory Map</h1>
        <p className="text-[#8c939d]">
          Platform directory mappings for Batocera and RetroPie native folder structures
        </p>
      </div>

      {/* Manufacturer Filter Button Group */}
      <div className="inline-flex border border-[#2d3238] flex-wrap">
        {manufacturers.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedManufacturer(m)}
            className={`px-3 py-1 font-semibold border-r border-[#2d3238] last:border-r-0 ${
              selectedManufacturer === m
                ? 'bg-[#337ab7] text-white'
                : 'bg-[#16181a] text-[#8c939d] hover:text-white hover:bg-[#22262a]'
            }`}
          >
            {m === 'ALL' ? 'All Manufacturers' : m}
          </button>
        ))}
      </div>

      {/* 2015 Flat Console Table */}
      <table className="w-full text-left border-collapse border border-[#2d3238]">
        <thead className="bg-[#16181a] text-[#8c939d] border-b border-[#2d3238]">
          <tr>
            <th className="p-2 border-r border-[#2d3238] w-48">Console / System</th>
            <th className="p-2 border-r border-[#2d3238] w-28">Maker</th>
            <th className="p-2 border-r border-[#2d3238] w-48">Batocera Folder</th>
            <th className="p-2 border-r border-[#2d3238] w-48">RetroPie Folder</th>
            <th className="p-2 border-r border-[#2d3238]">Supported Formats</th>
            <th className="p-2 w-20 text-center">Games</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2d3238]">
          {filteredPlatforms.map((p) => (
            <tr key={p.id} className="bg-[#22262a] hover:bg-[#1a1d20]">
              <td className="p-2 border-r border-[#2d3238] font-bold text-white">{p.name}</td>
              <td className="p-2 border-r border-[#2d3238] text-[#8c939d]">{p.manufacturer}</td>
              <td className="p-2 border-r border-[#2d3238]">
                <code className="bg-[#16181a] text-[#5bc0de] px-1.5 py-0.5 border border-[#2d3238]">
                  /roms/{p.batocera_folder}
                </code>
              </td>
              <td className="p-2 border-r border-[#2d3238]">
                <code className="bg-[#16181a] text-[#93c5fd] px-1.5 py-0.5 border border-[#2d3238]">
                  /roms/{p.retropie_folder}
                </code>
              </td>
              <td className="p-2 border-r border-[#2d3238]">
                <span className="text-[#5cb85c] font-bold mr-2">[{p.preferred_format}]</span>
                <span className="text-[#8c939d]">{p.extensions.join(', ')}</span>
              </td>
              <td className="p-2 text-center font-bold text-white">{p.game_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
