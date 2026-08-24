import React, { useState, useEffect } from 'react';
import { Droplet, X, Check, Clock } from 'lucide-react';
import '../css/drink-water.css';

const FORTY_MINUTES_MS = 40 * 60 * 1000; // 40 minutes

export const DrinkWaterReminder: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [glassesToday, setGlassesToday] = useState<number>(() => {
    const saved = localStorage.getItem('hiremind_water_count');
    const savedDate = localStorage.getItem('hiremind_water_date');
    const today = new Date().toDateString();
    if (savedDate === today && saved) {
      return parseInt(saved, 10);
    }
    return 0;
  });

  useEffect(() => {
    // Check next reminder timestamp
    const checkReminder = () => {
      const now = Date.now();
      const nextReminder = localStorage.getItem('hiremind_next_water_reminder');

      if (!nextReminder) {
        // Initialize next reminder
        localStorage.setItem('hiremind_next_water_reminder', String(now + FORTY_MINUTES_MS));
      } else {
        const targetTime = parseInt(nextReminder, 10);
        if (now >= targetTime) {
          setShowPopup(true);
        }
      }
    };

    // Check on mount and every 10 seconds
    checkReminder();
    const interval = setInterval(checkReminder, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDrankWater = () => {
    const today = new Date().toDateString();
    const newCount = glassesToday + 1;
    setGlassesToday(newCount);
    localStorage.setItem('hiremind_water_count', String(newCount));
    localStorage.setItem('hiremind_water_date', today);
    localStorage.setItem('hiremind_next_water_reminder', String(Date.now() + FORTY_MINUTES_MS));
    setShowPopup(false);
  };

  const handleSnooze = () => {
    // Snooze for 5 minutes
    localStorage.setItem('hiremind_next_water_reminder', String(Date.now() + 5 * 60 * 1000));
    setShowPopup(false);
  };

  if (!showPopup) return null;

  return (
    <div className="hydration-toast-overlay">
      <div className="hydration-card">
        <div className="hydration-header">
          <div className="hydration-title-badge">
            <Droplet size={14} color="#38BDF8" />
            <span>Hydration Reminder • 40m Interval</span>
          </div>
          <button onClick={() => setShowPopup(false)} className="hydration-close-btn" title="Dismiss">
            <X size={15} />
          </button>
        </div>

        <div className="hydration-body">
          <div className="hydration-icon-wrap">
            <Droplet size={26} />
          </div>
          <div className="hydration-content">
            <h4>Time to Drink Water! 💧</h4>
            <p>Stay sharp, focused, and energized. Take a quick sip of water now.</p>
          </div>
        </div>

        <div className="hydration-actions">
          <button onClick={handleDrankWater} className="btn-drink-confirm">
            <Check size={15} />
            <span>Drank Water! ({glassesToday} today)</span>
          </button>
          <button onClick={handleSnooze} className="btn-drink-snooze" title="Remind in 5 minutes">
            <Clock size={14} /> Snooze 5m
          </button>
        </div>
      </div>
    </div>
  );
};
