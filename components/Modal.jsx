'use client';

import { useEffect, useId, useRef } from 'react';

// A pop-up on the browser's own <dialog>, which keeps keyboard focus inside, closes on Escape, and makes the rest of
// the page inert while open. Clicking outside it closes it too. Its contents are only rendered while open.
export default function Modal({ open, onClose, title, children }) {
    const dialogRef = useRef(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            className="modal"
            aria-labelledby={titleId}
            onClose={onClose}
            // The dialog itself has no padding, so a click that lands on it rather than its contents is on the backdrop.
            onClick={event => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="modal-body">
                <div className="modal-header">
                    <h2 className="modal-title" id={titleId}>{title}</h2>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                {open && children}
            </div>
        </dialog>
    );
}
