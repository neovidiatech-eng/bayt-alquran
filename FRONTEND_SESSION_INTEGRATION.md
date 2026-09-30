# 📋 Frontend Integration Guide: Live Session Management (Join, Leave, End)

دليل تكامل الواجهة الأمامية (Frontend) مع الـ Backend لإدارة جلسات الحصص المباشرة، مع توضيح الفروقات بين صلاحيات **المعلم** و**الطالب**.

---

## 🔐 نظرة عامة على الصلاحيات والأدوار (Roles & Permissions)

| الإجراء (Action) | الطالب (Student) | المعلم (Teacher) | الوصف |
| :--- | :---: | :---: | :--- |
| **Join Session** | ✅ متاح | ✅ متاح | الانضمام للجلسة وتسجيل وقت الحضور |
| **Leave Session** | ✅ متاح | ✅ متاح | مغادرة الجلسة مؤقتاً/تسجيل وقت الخروج دون إنهائها |
| **End Session** | ❌ **غير مسموح** | ✅ **مسموح** | **إنهاء الجلسة كلياً للجميع** وتسوية حالة الجلسة والمستحقات |

---

## 📡 تفاصيل الـ Endpoints

الـ Base URL لجميع مسارات الجلسات:
```
/api/v1/schedules
```
> **ملاحظة:** تأكد من إرسال الـ `Authorization: Bearer <Token>` مع جميع الطلبات.

---

### 1. الانضمام إلى الجلسة (Join Session)

يستخدم عند دخول الطالب أو المعلم إلى غرفة الحصة.

- **Method:** `POST`
- **URL:** `/schedules/:id/join`
- **Headers:**
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Joined session successfully"
  }
  ```
- **Possible Errors:**
  - `400 TOO_EARLY_TO_JOIN`: محاولة الدخول قبل موعد الجلسة بأكثر من 5 دقائق.
  - `400 SESSION_ALREADY_FINISHED`: الجلسة انتهت بالفعل.
  - `404 SESSION_NOT_FOUND`: الجلسة غير موجودة.

---

### 2. مغادرة الجلسة (Leave Session)

يستخدم عند خروج المستخدم من الغرفة (إغلاق التاب / الضغط على زر Leave).
- **لا ينهي الجلسة للطرف الآخر**.
- يسجل وقت الخروج ويحسب مدة بقاء المستخدم في الجلسة.

- **Method:** `POST`
- **URL:** `/schedules/:id/leave`
- **Headers:**
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Left session successfully"
  }
  ```

---

### 3. إنهاء الجلسة (End Session) — 🔴 خاص بالمعلم فقط

يستخدم عند قيام المعلم بالضغط على زر **"إنهاء الجلسة للجميع" (End Session)**.
- **خاص بالمعلم المخصص لهذه الجلسة فقط** (أو الأدمن).
- يقوم بحساب مستحقات المعلم، تحديث حالة الجلسة إلى `completed`، وتحديث سجل الحضور، وإرسال إشعار للطالب بانتهاء الحصة.

- **Method:** `POST`
- **URL:** `/schedules/:id/end`
- **Headers:**
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Session ended successfully",
    "data": {
      "status": "completed"
    }
  }
  ```
- **Possible Errors:**
  - `403 ONLY_TEACHER_CAN_END_SESSION`: إذا حاول الطالب استدعاء هذا المسار.
  - `403 NOT_AUTHORIZED`: إذا حاول معلم آخر غير المعلم المخصص للجلسة إنهاءها.
  - `400 SESSION_ALREADY_FINISHED`: إذا كانت الجلسة منتهية أو ملغاة بالفعل.

---

## 🖥️ أمثلة تطبيقية للـ UI / UX في الـ Frontend

### 1. شاشة الطالب (Student Screen)
- **زر الخروج:** يظهر للطالب زر واحد فقط: **"مغادرة الجلسة" (Leave)**.
- **عند الضغط على الزر:**
  ```javascript
  await api.post(`/schedules/${sessionId}/leave`);
  // توجيه الطالب إلى الصفحة الرئيسية أو صفحة التقييم
  router.push(`/sessions/${sessionId}/review`);
  ```
- **عند استقبال إشعار أو حدث إنهاء الجلسة من المعلم:**
  - إظهار نافذة منبثقة: `"قام المعلم بإنهاء الجلسة"` مع تحويل الطالب لصفحة التقييم (`submitReview`).

---

### 2. شاشة المعلم (Teacher Screen)
- **يظهر للمعلم خياران في شريط التحكم:**
  1. **"مغادرة مؤقتة" (Leave):** استدعاء `POST /schedules/:id/leave`.
  2. **"إنهاء الجلسة للجميع" (End Session):** (زر أحمر بارز):
  ```javascript
  const handleEndSession = async () => {
    const confirm = await showConfirmModal({
      title: "إنهاء الجلسة",
      message: "هل أنت متأكد من رغبتك في إنهاء الجلسة للجميع؟ سيتم احتساب الحصة وإغلاقها.",
    });

    if (confirm) {
      const response = await api.post(`/schedules/${sessionId}/end`);
      showToast(response.data.message);
      router.push(`/teacher/dashboard`);
    }
  };
  ```

---

## 📦 كود مساعد جاهز (Axios API Service)

```typescript
// sessions.api.ts
import axiosInstance from "@/lib/axios";

export const sessionService = {
  // انضمام للجلسة
  joinSession: (sessionId: string) => {
    return axiosInstance.post(`/schedules/${sessionId}/join`);
  },

  // مغادرة الجلسة (للطالب والمعلم)
  leaveSession: (sessionId: string) => {
    return axiosInstance.post(`/schedules/${sessionId}/leave`);
  },

  // إنهاء الجلسة (للمعلم فقط)
  endSession: (sessionId: string) => {
    return axiosInstance.post(`/schedules/${sessionId}/end`);
  },

  // تقييم الجلسة بعد الانتهاء
  submitReview: (sessionId: string, data: { rating: number; comment?: string }) => {
    return axiosInstance.post(`/schedules/${sessionId}/review`, data);
  },
};
```
