# Shahi Architects: A Study in Digital Tectonics
### Final Year Project | MERN Stack Architectural Platform

## 📜 Abstract
Shahi Architects is a full-stack architectural portfolio and practice management system. It explores the intersection of **Digital Tectonics** and **Immersive Web UX** through a bespoke 3D interaction engine. The project demonstrates a robust implementation of the MERN (MongoDB, Express, React, Node.js) stack, focusing on data persistence, secure administrative oversight, and responsive architectural storytelling.

---

## 🚀 Technical Core
- **Frontend:** React.js + Three.js (React Three Fiber) + Framer Motion.
- **Backend:** Node.js + Express.js + JSON Web Tokens (JWT).
- **Database:** MongoDB Atlas (NoSQL) for architectural project archiving and lead monitoring.
- **UI/UX:** "Cargo-Inspired" technical minimalism, optimized for adaptive responsiveness.

---

## 🛠️ System Architecture

### 1. The Interactive 3D Engine
The landing experience utilizes a custom-built Three.js engine. High-resolution architectural renders are rendered onto 3D planes within a virtual Scene, synchronized with vertical scroll data for a horizontal "X-Axis" storytelling flow.

### 2. Secure Administrative Oversight
A restricted `/admin` portal provides the practice owner with a Command Centre to:
- **Project CRUD:** Dynamically Add, Update, or Delete portfolio works.
- **Lead Monitoring:** View and manage real-time client inquiries submitted via the Contact API.
- **Auth Guard:** Protected by Bcrypt password hashing and JWT (24-hour expiration).

### 3. Responsive Logic
The system implements typography clamping and adaptive 3D scaling, ensuring the architectural renders maintain their visual integrity across mobile, tablet, and ultra-wide displays.

---

## 📂 Installation & Deployment

### Backend Setup
1. `cd backend`
2. `npm install`
3. Configure `MONGO_URI` and `JWT_SECRET` in `.env`.
4. `npm start`

### Frontend Setup
1. `cd vite-project`
2. `npm install`
3. `npm run dev`

---

## 🎓 Author & Credits
- **Developer:** Arshvir Singh (Singh-Arshvir)
- **Project:** Final Year Submission 2026
- **Stack:** MERN Engineering & 3D Web Implementation

---

> [!NOTE]
> This project is a demonstration of full-stack engineering capability applied to architectural practice management.
