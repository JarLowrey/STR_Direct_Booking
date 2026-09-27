'use client';

import { useRef, useState } from 'react';

// Direct-booking terms as accessible tabs (arrow keys, Home, and End move between tabs). All
// panels are in the HTML so crawlers see every term; only the selected one is shown.
export default function BookingTabs({ tabs }) {
    const [selectedId, setSelectedId] = useState(tabs[0].id);
    const tabRefs = useRef({});

    const selectTab = (index, focus = false) => {
        const tab = tabs[(index + tabs.length) % tabs.length];
        setSelectedId(tab.id);
        if (focus) tabRefs.current[tab.id]?.focus();
    };

    const onKeyDown = (event, index) => {
        const targets = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
        if (!(event.key in targets)) {
            return;
        }

        event.preventDefault();
        selectTab(targets[event.key], true);
    };

    return (
        <>
            <div className="booking-tabs" role="tablist" aria-label="Direct booking details">
                {tabs.map((tab, index) => {
                    const isSelected = tab.id === selectedId;
                    return (
                        <button
                            key={tab.id}
                            ref={element => { tabRefs.current[tab.id] = element; }}
                            className="booking-tab"
                            id={`${tab.id}-tab`}
                            role="tab"
                            aria-selected={isSelected}
                            aria-controls={`${tab.id}-panel`}
                            tabIndex={isSelected ? 0 : -1}
                            onClick={() => selectTab(index)}
                            onKeyDown={event => onKeyDown(event, index)}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    className="booking-panel"
                    id={`${tab.id}-panel`}
                    role="tabpanel"
                    aria-labelledby={`${tab.id}-tab`}
                    tabIndex={0}
                    hidden={tab.id !== selectedId}
                >
                    {tab.content}
                </div>
            ))}
        </>
    );
}
