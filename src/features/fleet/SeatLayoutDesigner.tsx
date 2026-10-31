import React, { useState, useEffect } from 'react';
import { SeatLayout, SeatGridItem, SeatType } from '../../types';
import { dbStore } from '../../services/dbStore';
import {
  Armchair,
  Save,
  Check,
  Bed,
  Accessibility,
  Sparkles,
  Sliders,
  Plus,
  Minus,
  RefreshCw,
  Wand2,
} from 'lucide-react';

interface Props {
  tenantId: string;
}

export const SeatLayoutDesigner: React.FC<Props> = ({ tenantId }) => {
  const layouts = dbStore.getSeatLayouts(tenantId);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(
    layouts[0]?.id || ''
  );

  const currentLayout =
    layouts.find((l) => l.id === selectedLayoutId) || layouts[0];

  const [layoutName, setLayoutName] = useState(currentLayout?.name || 'Scania Multi-Axle Luxury & Sleeper (36 Seats)');
  const [layoutType, setLayoutType] = useState<SeatLayout['layout_type']>(
    currentLayout?.layout_type || '2+2'
  );
  const [rowsCount, setRowsCount] = useState<number>(currentLayout?.rows_count || 9);
  const [colsCount, setColsCount] = useState<number>(currentLayout?.cols_count || 4);
  const [seats, setSeats] = useState<SeatGridItem[]>(currentLayout?.grid_data || []);
  const [selectedTool, setSelectedTool] = useState<SeatType>('sleeper');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live seat type counts
  const countSleeper = seats.filter((s) => s.type === 'sleeper').length;
  const countDisabled = seats.filter((s) => s.type === 'disabled').length;
  const countFemale = seats.filter((s) => s.type === 'female').length;
  const countPremium = seats.filter((s) => s.type === 'premium').length;
  const countRegular = seats.filter((s) => s.type === 'regular').length;
  const totalSeats = seats.length;

  // Quota Configurator state
  const [quotaSleeper, setQuotaSleeper] = useState<number>(4);
  const [quotaDisabled, setQuotaDisabled] = useState<number>(2);
  const [quotaFemale, setQuotaFemale] = useState<number>(4);
  const [quotaPremium, setQuotaPremium] = useState<number>(4);
  const [sleeperExtraFare, setSleeperExtraFare] = useState<number>(350);
  const [premiumExtraFare, setPremiumExtraFare] = useState<number>(200);

  useEffect(() => {
    if (currentLayout) {
      setLayoutName(currentLayout.name);
      setLayoutType(currentLayout.layout_type);
      setRowsCount(currentLayout.rows_count);
      setColsCount(currentLayout.cols_count);
      setSeats([...currentLayout.grid_data]);

      const slCount = currentLayout.grid_data.filter((s) => s.type === 'sleeper').length;
      const disCount = currentLayout.grid_data.filter((s) => s.type === 'disabled').length;
      const femCount = currentLayout.grid_data.filter((s) => s.type === 'female').length;
      const premCount = currentLayout.grid_data.filter((s) => s.type === 'premium').length;

      setQuotaSleeper(slCount || 4);
      setQuotaDisabled(disCount || 2);
      setQuotaFemale(femCount || 4);
      setQuotaPremium(premCount || 4);
    }
  }, [selectedLayoutId]);

  // Switch layout template
  const handleSelectTemplate = (id: string) => {
    const target = layouts.find((l) => l.id === id);
    if (!target) return;
    setSelectedLayoutId(target.id);
  };

  // Generate standard template grid
  const handleGeneratePreset = (type: SeatLayout['layout_type']) => {
    setLayoutType(type);
    const cols = type === '2+2' ? 4 : type === '2+1' ? 3 : type === '1+1' ? 2 : 4;
    setColsCount(cols);

    const newSeats: SeatGridItem[] = [];
    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

    for (let r = 1; r <= rowsCount; r++) {
      const letter = rowLetters[r - 1] || `R${r}`;
      for (let c = 1; c <= cols; c++) {
        let seatType: SeatType = 'regular';
        let extraFare = 0;
        let priceMultiplier = 1.0;
        let isAccessible = false;

        if (r === 1 && (c === 1 || c === 2)) {
          seatType = 'sleeper';
          extraFare = sleeperExtraFare;
          priceMultiplier = 1.25;
        } else if (r === 1 && (c === 3 || c === 4)) {
          seatType = 'disabled';
          isAccessible = true;
        } else if (r === 2 && (c === 1 || c === 2)) {
          seatType = 'sleeper';
          extraFare = sleeperExtraFare;
          priceMultiplier = 1.25;
        } else if (r === 3 && (c === 3 || c === 4)) {
          seatType = 'female';
        } else if (r === 5) {
          seatType = 'premium';
          extraFare = premiumExtraFare;
          priceMultiplier = 1.15;
        }

        newSeats.push({
          seat_number: `${letter}${c}`,
          deck: 1,
          row: r,
          col: c,
          type: seatType,
          is_accessible: isAccessible,
          extra_fare: extraFare,
          price_multiplier: priceMultiplier,
        });
      }
    }
    setSeats(newSeats);
  };

  // Admin sets quota: auto-distribute configured number of seats of each type
  const handleApplyQuotaDistribution = () => {
    if (seats.length === 0) return;

    const sorted = [...seats].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    let remSleeper = quotaSleeper;
    let remDisabled = quotaDisabled;
    let remFemale = quotaFemale;
    let remPremium = quotaPremium;

    const mapped = sorted.map((seat) => {
      // 1. Place Disabled seats at front near entrance (Row 1-2, cols 3-4)
      if (remDisabled > 0 && seat.row <= 2 && seat.col >= 3) {
        remDisabled--;
        return {
          ...seat,
          type: 'disabled' as SeatType,
          is_accessible: true,
          extra_fare: 0,
          price_multiplier: 1.0,
        };
      }

      // 2. Place Sleeper berths in front rows (Row 1-2, cols 1-2)
      if (remSleeper > 0 && seat.row <= 3 && seat.col <= 2) {
        remSleeper--;
        return {
          ...seat,
          type: 'sleeper' as SeatType,
          is_accessible: false,
          extra_fare: sleeperExtraFare,
          price_multiplier: 1.25,
        };
      }

      // 3. Place Female reserved in row 3
      if (remFemale > 0 && seat.row === 3 && (seat.col === 3 || seat.col === 4)) {
        remFemale--;
        return {
          ...seat,
          type: 'female' as SeatType,
          is_accessible: false,
          extra_fare: 0,
          price_multiplier: 1.0,
        };
      }

      // 4. Place Premium VIP in row 5
      if (remPremium > 0 && seat.row === 5) {
        remPremium--;
        return {
          ...seat,
          type: 'premium' as SeatType,
          is_accessible: false,
          extra_fare: premiumExtraFare,
          price_multiplier: 1.15,
        };
      }

      return {
        ...seat,
        type: 'regular' as SeatType,
        is_accessible: false,
        extra_fare: 0,
        price_multiplier: 1.0,
      };
    });

    // Second pass: fill any remaining quotas anywhere in the bus
    const finalSeats = mapped.map((seat) => {
      if (seat.type !== 'regular') return seat;
      if (remDisabled > 0) {
        remDisabled--;
        return { ...seat, type: 'disabled' as SeatType, is_accessible: true, extra_fare: 0, price_multiplier: 1.0 };
      }
      if (remSleeper > 0) {
        remSleeper--;
        return { ...seat, type: 'sleeper' as SeatType, is_accessible: false, extra_fare: sleeperExtraFare, price_multiplier: 1.25 };
      }
      if (remFemale > 0) {
        remFemale--;
        return { ...seat, type: 'female' as SeatType, is_accessible: false, extra_fare: 0, price_multiplier: 1.0 };
      }
      if (remPremium > 0) {
        remPremium--;
        return { ...seat, type: 'premium' as SeatType, is_accessible: false, extra_fare: premiumExtraFare, price_multiplier: 1.15 };
      }
      return seat;
    });

    setSeats(finalSeats);
  };

  // Toggle or change seat type on click
  const handleSeatClick = (row: number, col: number) => {
    const existingIdx = seats.findIndex((s) => s.row === row && s.col === col);
    if (existingIdx >= 0) {
      if (seats[existingIdx].type === selectedTool) {
        // Remove seat (make aisle / empty door space)
        setSeats(seats.filter((_, i) => i !== existingIdx));
      } else {
        // Change type
        const updated = [...seats];
        let extraFare = 0;
        let priceMultiplier = 1.0;
        let isAccessible = false;

        if (selectedTool === 'sleeper') {
          extraFare = sleeperExtraFare;
          priceMultiplier = 1.25;
        } else if (selectedTool === 'disabled') {
          isAccessible = true;
        } else if (selectedTool === 'premium') {
          extraFare = premiumExtraFare;
          priceMultiplier = 1.15;
        }

        updated[existingIdx] = {
          ...updated[existingIdx],
          type: selectedTool,
          extra_fare: extraFare,
          price_multiplier: priceMultiplier,
          is_accessible: isAccessible,
        };
        setSeats(updated);
      }
    } else {
      // Add seat at position
      const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
      const letter = rowLetters[row - 1] || `R${row}`;
      setSeats([
        ...seats,
        {
          seat_number: `${letter}${col}`,
          deck: 1,
          row,
          col,
          type: selectedTool,
          extra_fare: selectedTool === 'sleeper' ? sleeperExtraFare : selectedTool === 'premium' ? premiumExtraFare : 0,
          price_multiplier: selectedTool === 'sleeper' ? 1.25 : selectedTool === 'premium' ? 1.15 : 1.0,
          is_accessible: selectedTool === 'disabled',
        },
      ]);
    }
  };

  const handleSaveLayout = () => {
    const newLayout: SeatLayout = {
      id: selectedLayoutId.startsWith('new-') ? 'layout-' + Date.now() : selectedLayoutId,
      tenant_id: tenantId,
      name: layoutName,
      rows_count: rowsCount,
      cols_count: colsCount,
      decks_count: 1,
      layout_type: layoutType,
      grid_data: seats,
      is_template: true,
    };
    dbStore.saveSeatLayout(newLayout);
    setSelectedLayoutId(newLayout.id);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const getSeatColor = (type: SeatType) => {
    switch (type) {
      case 'sleeper':
        return 'bg-purple-50 text-purple-800 border-purple-400 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-600 shadow-purple-500/10';
      case 'disabled':
        return 'bg-teal-50 text-teal-800 border-teal-400 dark:bg-teal-950/70 dark:text-teal-200 dark:border-teal-600 shadow-teal-500/10';
      case 'female':
        return 'bg-pink-50 text-pink-800 border-pink-400 dark:bg-pink-950/70 dark:text-pink-200 dark:border-pink-600 shadow-pink-500/10';
      case 'premium':
        return 'bg-amber-50 text-amber-800 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-600 shadow-amber-500/10';
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700';
    }
  };

  const renderSeatIcon = (type: SeatType) => {
    switch (type) {
      case 'sleeper':
        return <Bed className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'disabled':
        return <Accessibility className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'female':
        return <Armchair className="w-4 h-4 text-pink-600 dark:text-pink-400" />;
      case 'premium':
        return <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Armchair className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <span>Bus Seat Type &amp; Fleet Quota Configurator</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set exact seat counts for Sleeper Berths, Disabled/Accessible Priority seats, Female-reserved, and Premium recliners.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveLayout}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saveSuccess ? 'Saved Successfully!' : 'Save Layout & Quotas'}
          </button>
        </div>
      </div>

      {/* Live Seat Composition Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Placed</span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono">{totalSeats}</span>
          </div>
          <Armchair className="w-5 h-5 text-blue-500 opacity-80" />
        </div>

        <div className="bg-purple-50/50 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-200 dark:border-purple-800/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-purple-600 dark:text-purple-300 font-bold uppercase block">Sleeper Berths</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-purple-700 dark:text-purple-300 font-mono">{countSleeper}</span>
              <span className="text-[10px] text-purple-500 font-semibold">+৳{sleeperExtraFare}</span>
            </div>
          </div>
          <Bed className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>

        <div className="bg-teal-50/50 dark:bg-teal-950/30 p-3 rounded-xl border border-teal-200 dark:border-teal-800/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-teal-600 dark:text-teal-300 font-bold uppercase block">Accessible / Disabled</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-teal-700 dark:text-teal-300 font-mono">{countDisabled}</span>
              <span className="text-[10px] text-teal-600 font-semibold">Priority</span>
            </div>
          </div>
          <Accessibility className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>

        <div className="bg-pink-50/50 dark:bg-pink-950/30 p-3 rounded-xl border border-pink-200 dark:border-pink-800/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-pink-600 dark:text-pink-300 font-bold uppercase block">Female Reserved</span>
            <span className="text-lg font-black text-pink-700 dark:text-pink-300 font-mono">{countFemale}</span>
          </div>
          <Armchair className="w-5 h-5 text-pink-500" />
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-amber-600 dark:text-amber-300 font-bold uppercase block">VIP / Premium</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono">{countPremium}</span>
              <span className="text-[10px] text-amber-600 font-semibold">+৳{premiumExtraFare}</span>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-amber-500" />
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-bold uppercase block">Standard Seats</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">{countRegular}</span>
          </div>
          <Armchair className="w-5 h-5 text-emerald-500" />
        </div>
      </div>

      {/* Main Designer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Admin Quota Setter & Tools */}
        <div className="lg:col-span-5 space-y-4">
          {/* Preset Selector */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 text-xs">
            <div>
              <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                Active Seat Layout Preset
              </label>
              <select
                value={selectedLayoutId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
              >
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.layout_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                Layout Display Name
              </label>
              <input
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleGeneratePreset('2+2')}
                className={`py-1.5 rounded font-semibold border ${
                  layoutType === '2+2'
                    ? 'bg-blue-50 text-blue-700 border-blue-400 dark:bg-blue-950 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                2+2 Coach (36/40)
              </button>
              <button
                type="button"
                onClick={() => handleGeneratePreset('sleeper')}
                className={`py-1.5 rounded font-semibold border ${
                  layoutType === 'sleeper'
                    ? 'bg-purple-50 text-purple-700 border-purple-400 dark:bg-purple-950 dark:text-purple-300'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                Sleeper Coach (24)
              </button>
            </div>
          </div>

          {/* ADMIN QUOTA CONFIGURATOR: "Admin set how many seat will be of what type" */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50 dark:from-slate-800 dark:to-slate-900 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900 dark:text-white">Admin Seat Quota Allocator</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                Auto-Distribute
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Set the exact number of seats allocated for each passenger type. Click &quot;Apply Quota&quot; to arrange them instantly.
            </p>

            {/* Stepper Inputs for Each Type */}
            <div className="space-y-2.5 pt-1">
              {/* Sleeper Berth Quota */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                    <Bed className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Sleeper Berths</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400">Reclining luxury beds</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded">
                    <button
                      type="button"
                      onClick={() => setQuotaSleeper(Math.max(0, quotaSleeper - 2))}
                      className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold font-mono">{quotaSleeper}</span>
                    <button
                      type="button"
                      onClick={() => setQuotaSleeper(quotaSleeper + 2)}
                      className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="w-20">
                    <span className="text-[9px] text-slate-400 block">+Fare (৳)</span>
                    <input
                      type="number"
                      value={sleeperExtraFare}
                      onChange={(e) => setSleeperExtraFare(Number(e.target.value))}
                      className="w-full px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Disabled / Accessible Quota */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300">
                    <Accessibility className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Disabled / Accessible</span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400">Front door mobility seating</span>
                  </div>
                </div>
                <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded">
                  <button
                    type="button"
                    onClick={() => setQuotaDisabled(Math.max(0, quotaDisabled - 1))}
                    className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center font-bold font-mono">{quotaDisabled}</span>
                  <button
                    type="button"
                    onClick={() => setQuotaDisabled(quotaDisabled + 1)}
                    className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Female Reserved Quota */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-pink-200 dark:border-pink-800">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300">
                    <Armchair className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Female Reserved</span>
                    <span className="text-[10px] text-pink-600 dark:text-pink-400">Women-only safety seating</span>
                  </div>
                </div>
                <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded">
                  <button
                    type="button"
                    onClick={() => setQuotaFemale(Math.max(0, quotaFemale - 2))}
                    className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center font-bold font-mono">{quotaFemale}</span>
                  <button
                    type="button"
                    onClick={() => setQuotaFemale(quotaFemale + 2)}
                    className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Premium VIP Quota */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">VIP / Business Recliner</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">Extra legroom recliners</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded">
                    <button
                      type="button"
                      onClick={() => setQuotaPremium(Math.max(0, quotaPremium - 2))}
                      className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold font-mono">{quotaPremium}</span>
                    <button
                      type="button"
                      onClick={() => setQuotaPremium(quotaPremium + 2)}
                      className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="w-20">
                    <span className="text-[9px] text-slate-400 block">+Fare (৳)</span>
                    <input
                      type="number"
                      value={premiumExtraFare}
                      onChange={(e) => setPremiumExtraFare(Number(e.target.value))}
                      className="w-full px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyQuotaDistribution}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Wand2 className="w-4 h-4" />
              <span>Apply Seat Quotas to Coach Layout</span>
            </button>
          </div>

          {/* Active Brush Tool */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 text-xs">
            <label className="font-semibold block text-slate-700 dark:text-slate-300">
              Manual Seat Paint Brush
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { type: 'sleeper', label: '🛏️ Sleeper Berth', color: 'bg-purple-600 text-white' },
                { type: 'disabled', label: '♿ Accessible', color: 'bg-teal-600 text-white' },
                { type: 'female', label: '👩 Female Reserved', color: 'bg-pink-600 text-white' },
                { type: 'premium', label: '⭐ VIP Recliner', color: 'bg-amber-600 text-white' },
                { type: 'regular', label: '💺 Regular Seat', color: 'bg-emerald-600 text-white' },
              ].map((tool) => (
                <button
                  key={tool.type}
                  type="button"
                  onClick={() => setSelectedTool(tool.type as SeatType)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium border text-[11px] cursor-pointer transition ${
                    selectedTool === tool.type
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md ring-2 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="truncate">{tool.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 pt-1">
              Click any cell on the coach to paint or click an existing matching seat to remove it (aisle).
            </p>
          </div>
        </div>

        {/* Right Column (7 cols): Coach Shell Visual Map */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-700 text-xs">
            <span className="font-bold text-slate-900 dark:text-white">
              Coach Shell Blueprint ({layoutName})
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {totalSeats} Total Seats Placed
            </span>
          </div>

          {/* Coach Shell Container */}
          <div className="w-full max-w-md bg-slate-50 dark:bg-slate-900/90 p-5 rounded-3xl border-2 border-slate-300 dark:border-slate-700 relative shadow-inner">
            {/* Front windshield & steering wheel */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-dashed border-slate-300 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                  ⚙️
                </div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Driver Cab
                </span>
              </div>
              <div className="px-3 py-1 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 rounded text-[10px] font-bold border border-teal-300 dark:border-teal-700">
                PASSENGER ENTRANCE / DOOR
              </div>
            </div>

            {/* Visual Rows */}
            <div className="space-y-3">
              {Array.from({ length: rowsCount }, (_, rIdx) => {
                const row = rIdx + 1;
                return (
                  <div key={row} className="flex items-center justify-between gap-2">
                    <span className="w-5 text-center text-[10px] font-bold text-slate-400 font-mono">
                      {row}
                    </span>

                    {/* Columns with central walking aisle */}
                    <div className="flex-1 flex items-center justify-around">
                      {Array.from({ length: colsCount }, (_, cIdx) => {
                        const col = cIdx + 1;
                        const seat = seats.find((s) => s.row === row && s.col === col);
                        const isAisle = colsCount === 4 && col === 2; // Gap after column 2 for 2+2
                        const isAisle21 = colsCount === 3 && col === 1; // Gap after column 1 for 2+1

                        return (
                          <React.Fragment key={col}>
                            <button
                              type="button"
                              onClick={() => handleSeatClick(row, col)}
                              title={
                                seat
                                  ? `${seat.seat_number}: ${seat.type.toUpperCase()}${seat.extra_fare ? ` (+৳${seat.extra_fare})` : ''}`
                                  : 'Empty Aisle Space (Click to add seat)'
                              }
                              className={`w-11 h-12 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 ${
                                seat
                                  ? getSeatColor(seat.type)
                                  : 'bg-transparent border-dashed border-slate-300 dark:border-slate-700 text-slate-300 hover:border-blue-400'
                              }`}
                            >
                              {seat ? (
                                <>
                                  {renderSeatIcon(seat.type)}
                                  <span className="text-[10px] font-bold font-mono leading-none mt-0.5">
                                    {seat.seat_number}
                                  </span>
                                  {seat.type === 'sleeper' && (
                                    <span className="text-[7px] font-extrabold uppercase tracking-tighter text-purple-700 dark:text-purple-300">
                                      BED
                                    </span>
                                  )}
                                  {seat.type === 'disabled' && (
                                    <span className="text-[7px] font-extrabold uppercase tracking-tighter text-teal-700 dark:text-teal-300">
                                      ♿
                                    </span>
                                  )}
                                </>
                              ) : (
                                <Plus className="w-3 h-3 text-slate-300" />
                              )}
                            </button>

                            {/* Middle Walking Aisle */}
                            {(isAisle || isAisle21) && (
                              <div className="w-5 text-center text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase select-none">
                                •
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rear of bus */}
            <div className="text-center pt-4 mt-4 border-t-2 border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Rear Engine Compartment
            </div>
          </div>

          {/* Interactive Legend */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200">
              <Bed className="w-3.5 h-3.5 text-purple-600" />
              Sleeper Berth (+৳{sleeperExtraFare})
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200">
              <Accessibility className="w-3.5 h-3.5 text-teal-600" />
              Accessible / Disabled
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 text-pink-800 dark:text-pink-200">
              <Armchair className="w-3.5 h-3.5 text-pink-600" />
              Female Reserved
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              VIP Recliner (+৳{premiumExtraFare})
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
              <Armchair className="w-3.5 h-3.5 text-emerald-600" />
              Regular Seat
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
