```bash
cd /home/kali/Documents/earn-online
npm install
npm start
```

Open http://localhost:3000 in two browser windows to test chats between users.

Features:
- Register with name and phone — appears in the contacts list.
- Invite another online user to chat; they can accept or decline.
- Real-time messaging via Socket.IO and rooms.
- Leave the chat with the Leave button.
# Earn Online

A full investment and earning platform built for Uganda.

## Features
- Investment plans: x2 return in 30 days (standard plan)
- Mobile money payment integration (MTN, Airtel, Card)
- 30-day withdrawal lock system
- VIP referral system (5 tiers)
- Urban Jet crash game (Aviator style)
- Admin panel + Owners page
- User dashboard with live stats

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Payments: mobile money and checkout service

## Run Locally
```bash
cd backend
npm install
node server.js
```
Then open http://localhost:3000

## Deploy
Deployed on Render.com — see render.yaml
