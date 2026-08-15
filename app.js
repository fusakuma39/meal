// Sakuma Family Meal Manager Core Script (Gift Button placed under Brother Tabs)

const APP_STORAGE_KEY = 'sakuma_family_meal_manager_data';

const defaultState = {
    members: {
        mother: '一覧',
        brother1: 'かいり',
        brother2: 'いっけい'
    },
    mealData: {}
};

class MealApp {
    constructor() {
        this.state = this.loadState();
        this.currentRole = 'mother'; // 'mother' (一覧), 'brother1' (かいり), 'brother2' (いっけい)
        this.currentWeekOffset = 0;
        this.isLocalUpdate = false;

        this.initElements();
        this.bindEvents();
        this.initFirebaseSDK();
        this.render();
    }

    loadState() {
        try {
            const saved = localStorage.getItem(APP_STORAGE_KEY);
            if (saved) {
                return { ...defaultState, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Failed to load state', e);
        }
        return defaultState;
    }

    saveState() {
        try {
            localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(this.state));
            this.isLocalUpdate = true;
            this.saveToFirebase();
        } catch (e) {
            console.error('Failed to save state', e);
        }
    }

    initFirebaseSDK() {
        if (window.firebaseConfig && typeof firebase !== 'undefined') {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(window.firebaseConfig);
                }
                this.db = firebase.database();
                
                // Realtime Listener for auto sync
                this.db.ref('mealData').on('value', (snapshot) => {
                    if (this.isLocalUpdate) {
                        this.isLocalUpdate = false;
                        return;
                    }
                    const data = snapshot.val();
                    if (data) {
                        this.state.mealData = data;
                        this.render();
                    }
                });
            } catch (e) {
                console.warn('Firebase SDK init warning:', e);
            }
        }
    }

    saveToFirebase() {
        if (this.db) {
            try {
                this.db.ref('mealData').set(this.state.mealData);
            } catch (e) {
                console.warn('Firebase set error:', e);
            }
        }
    }

    initElements() {
        // Tabs
        this.tabMother = document.getElementById('tab-mother');
        this.tabBrother1 = document.getElementById('tab-brother1');
        this.tabBrother2 = document.getElementById('tab-brother2');

        // View title
        this.currentViewTitle = document.getElementById('current-view-title');

        // Week nav
        this.currentWeekLabel = document.getElementById('current-week-label');
        this.prevWeekBtn = document.getElementById('prev-week-btn');
        this.nextWeekBtn = document.getElementById('next-week-btn');

        // Container
        this.weekCardsContainer = document.getElementById('week-cards-container');
        this.giftButtonContainer = document.getElementById('gift-button-container');

        this.toast = document.getElementById('toast');
    }

    bindEvents() {
        // Role Segment Switch
        document.querySelectorAll('.segment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchRole(e.target.dataset.role);
            });
        });

        // Week Navigation
        this.prevWeekBtn.addEventListener('click', () => {
            this.currentWeekOffset--;
            this.render();
        });

        this.nextWeekBtn.addEventListener('click', () => {
            this.currentWeekOffset++;
            this.render();
        });
    }

    switchRole(role) {
        this.currentRole = role;
        document.querySelectorAll('.segment').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.role === role);
        });

        if (role === 'mother') {
            this.currentViewTitle.textContent = '佐久間家のご飯予定一覧';
            // ギフトボタンは一覧（お母さん）タブでは隠す
            if (this.giftButtonContainer) this.giftButtonContainer.style.display = 'none';
        } else if (role === 'brother1') {
            this.currentViewTitle.textContent = 'かいりの予定入力';
            // かいりタブの最下部に表示
            if (this.giftButtonContainer) this.giftButtonContainer.style.display = 'block';
        } else {
            this.currentViewTitle.textContent = 'いっけいの予定入力';
            // いっけいタブの最下部に表示
            if (this.giftButtonContainer) this.giftButtonContainer.style.display = 'block';
        }

        this.render();
    }

    getWeekDays() {
        const days = [];
        const today = new Date();
        const startDay = new Date(today);
        startDay.setDate(today.getDate() + (this.currentWeekOffset * 7));

        for (let i = 0; i < 7; i++) {
            const d = new Date(startDay);
            d.setDate(startDay.getDate() + i);
            days.push(d);
        }
        return days;
    }

    formatDateKey(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    getDayData(dateKey, role) {
        if (!this.state.mealData[dateKey]) {
            this.state.mealData[dateKey] = {};
        }

        if (!this.state.mealData[dateKey][role]) {
            this.state.mealData[dateKey][role] = {
                lunch: 'unset',
                dinner: 'unset',
                note: ''
            };
        }

        return this.state.mealData[dateKey][role];
    }

    isCellEditable(cellRole) {
        return this.currentRole === cellRole;
    }

    getNextState(current) {
        if (current === 'unset') return 'needed';
        if (current === 'needed') return 'not-needed';
        return 'unset';
    }

    render() {
        this.updateMemberNames();
        const days = this.getWeekDays();
        const startStr = `${days[0].getMonth() + 1}/${days[0].getDate()}`;
        const endStr = `${days[6].getMonth() + 1}/${days[6].getDate()}`;

        let labelText = '';
        if (this.currentWeekOffset === 0) labelText = `今週 (${startStr} 〜 ${endStr})`;
        else if (this.currentWeekOffset === 1) labelText = `来週 (${startStr} 〜 ${endStr})`;
        else if (this.currentWeekOffset === -1) labelText = `先週 (${startStr} 〜 ${endStr})`;
        else labelText = `${startStr} 〜 ${endStr}`;

        this.currentWeekLabel.textContent = labelText;
        this.renderWeekView(days);
    }

    updateMemberNames() {
        this.tabMother.textContent = '一覧';
        this.tabBrother1.textContent = 'かいり';
        this.tabBrother2.textContent = 'いっけい';
    }

    renderWeekView(days) {
        this.weekCardsContainer.innerHTML = '';
        const weekdaysJP = ['日', '月', '火', '水', '木', '金', '土'];

        const b1Name = 'かいり';
        const b2Name = 'いっけい';

        const canEditB1 = this.isCellEditable('brother1');
        const canEditB2 = this.isCellEditable('brother2');

        days.forEach(date => {
            const dateKey = this.formatDateKey(date);
            const monthDay = `${date.getMonth() + 1}/${date.getDate()}`;
            const dayOfWeekIndex = date.getDay();
            const weekdayStr = weekdaysJP[dayOfWeekIndex];

            let weekdayClass = '';
            if (dayOfWeekIndex === 0) weekdayClass = 'sun';
            if (dayOfWeekIndex === 6) weekdayClass = 'sat';

            const b1Data = this.getDayData(dateKey, 'brother1');
            const b2Data = this.getDayData(dateKey, 'brother2');

            const oxSymbol = (val) => {
                if (val === 'needed') return '<span class="ox-symbol-val circle">⭕</span>';
                if (val === 'not-needed') return '<span class="ox-symbol-val cross">✖</span>';
                return '<span class="ox-symbol-val unset">ー</span>';
            };

            const isMother = this.currentRole === 'mother';

            const cardHTML = `
                <div class="day-week-card" data-date="${dateKey}">
                    <div class="card-header-row">
                        <div class="date-badge">
                            <span class="day-date">${monthDay}</span>
                            <span class="day-weekday ${weekdayClass}">(${weekdayStr})</span>
                        </div>
                    </div>

                    <!-- Equal Width Cross Table -->
                    <table class="meal-cross-table">
                        <thead>
                            <tr>
                                <th class="meal-col-header"></th>
                                <th class="person-col ${canEditB1 ? 'editable-col-header' : ''}">${b1Name}</th>
                                <th class="person-col ${canEditB2 ? 'editable-col-header' : ''}">${b2Name}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="meal-type-cell">昼</td>
                                <td class="ox-interactive-cell ${canEditB1 ? 'editable' : 'readonly'}" data-date="${dateKey}" data-role="brother1" data-meal="lunch">
                                    ${oxSymbol(b1Data.lunch)}
                                </td>
                                <td class="ox-interactive-cell ${canEditB2 ? 'editable' : 'readonly'}" data-date="${dateKey}" data-role="brother2" data-meal="lunch">
                                    ${oxSymbol(b2Data.lunch)}
                                </td>
                            </tr>
                            <tr>
                                <td class="meal-type-cell">夜</td>
                                <td class="ox-interactive-cell ${canEditB1 ? 'editable' : 'readonly'}" data-date="${dateKey}" data-role="brother1" data-meal="dinner">
                                    ${oxSymbol(b1Data.dinner)}
                                </td>
                                <td class="ox-interactive-cell ${canEditB2 ? 'editable' : 'readonly'}" data-date="${dateKey}" data-role="brother2" data-meal="dinner">
                                    ${oxSymbol(b2Data.dinner)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Notes Input / Display -->
                    <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
                        ${isMother ? (b1Data.note ? `<div class="card-note-box"><span class="note-author">💬 ${b1Name}の備考:</span><span>${b1Data.note}</span></div>` : '') : ''}
                        ${canEditB1 ? `<textarea class="hig-textarea note-input editable-note" data-date="${dateKey}" data-role="brother1" placeholder="${b1Name}の備考入力">${b1Data.note || ''}</textarea>` : ''}

                        ${isMother ? (b2Data.note ? `<div class="card-note-box"><span class="note-author">💬 ${b2Name}の備考:</span><span>${b2Data.note}</span></div>` : '') : ''}
                        ${canEditB2 ? `<textarea class="hig-textarea note-input editable-note" data-date="${dateKey}" data-role="brother2" placeholder="${b2Name}の備考入力">${b2Data.note || ''}</textarea>` : ''}
                    </div>
                </div>
            `;

            this.weekCardsContainer.insertAdjacentHTML('beforeend', cardHTML);
        });

        // Tap toggle event
        this.weekCardsContainer.querySelectorAll('.ox-interactive-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const targetCell = e.currentTarget;
                const role = targetCell.dataset.role;

                if (!this.isCellEditable(role)) {
                    return;
                }

                const dateKey = targetCell.dataset.date;
                const meal = targetCell.dataset.meal;

                const data = this.getDayData(dateKey, role);
                data[meal] = this.getNextState(data[meal]);

                this.saveState();
                
                const oxSymbol = (val) => {
                    if (val === 'needed') return '<span class="ox-symbol-val circle">⭕</span>';
                    if (val === 'not-needed') return '<span class="ox-symbol-val cross">✖</span>';
                    return '<span class="ox-symbol-val unset">ー</span>';
                };
                targetCell.innerHTML = oxSymbol(data[meal]);
            });
        });

        // Textarea note input handler
        this.weekCardsContainer.querySelectorAll('.note-input').forEach(textarea => {
            textarea.addEventListener('change', (e) => {
                const role = e.target.dataset.role;

                if (!this.isCellEditable(role)) {
                    return;
                }

                const dateKey = e.target.dataset.date;
                const data = this.getDayData(dateKey, role);
                data.note = e.target.value;

                this.saveState();
            });
        });
    }

    showToast(msg) {
        this.toast.textContent = msg;
        this.toast.classList.add('show');
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.mealApp = new MealApp();
});
