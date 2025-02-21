import React, { useState, useEffect, useRef } from "react";

export default function DownloadGeoJson() {
  // الإعدادات العامة
  const [useProxy, setUseProxy] = useState(!false);
  const [fileType, setFileType] = useState("geoJSON");
  const [cityId, setCityId] = useState("00100001");
  const [cityName, setCityName] = useState("المدينة");
  const [lastObjectId, setLastObjectId] = useState(32561134);
  const [objectIdOperator, setObjectIdOperator] = useState(">");
  const [resultRecordCount, setResultRecordCount] = useState(2000);
  const [baseUrl, setBaseUrl] = useState("");

  // إعدادات التنزيل التلقائي
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [minDelay, setMinDelay] = useState(5); // بالثواني
  const [maxDelay, setMaxDelay] = useState(100); // بالثواني
  const [waitingTime, setWaitingTime] = useState(0);

  // قائمة المعرّفات التي تم تنزيلها لمنع التكرار
  const [downloadedIds, setDownloadedIds] = useState<number[]>([]);

  // مرجع لتحديث lastObjectId داخل الدوال
  const lastObjectIdRef = useRef(lastObjectId);
  useEffect(() => {
    lastObjectIdRef.current = lastObjectId;
  }, [lastObjectId]);

  // تحديث الرابط الأساسي بناءً على الإعدادات وخيار البروكسي
  useEffect(() => {
    const operatorEncoded = encodeURIComponent(objectIdOperator);
    const queryUrl = `https://umapsudp.momrah.gov.sa/server/rest/services/Umaps/Umaps_Click/MapServer/28/query?outFields=*&resultOffset=0&resultRecordCount=${resultRecordCount}&f=${fileType}&where=CITY_ID%3D'${cityId}'%20AND%20OBJECTID${operatorEncoded}${lastObjectIdRef.current}`;
    const url = useProxy
      ? `https://umaps.balady.gov.sa/newProxyUDP/proxy.ashx?${queryUrl}`
      : queryUrl;
    setBaseUrl(url);
    console.log("آخر تحديث للرابط:", url);
  }, [cityId, lastObjectId, objectIdOperator, resultRecordCount, fileType, useProxy]);

  // الدالة الأساسية لمعالجة التنزيل
  const processDownload = async () => {
    // التأكد من أن الطلب جديد ولم يتم طلبه مسبقاً
    if (downloadedIds.includes(lastObjectIdRef.current)) {
      console.log("⚠️ تم تنزيل البيانات مسبقاً لهذا المعرف:", lastObjectIdRef.current);
      const newId = window.prompt("أدخل معرف جديد:");
      if (newId) {
        setLastObjectId(Number(newId));
      }
      return null;
    }
    const operatorEncoded = encodeURIComponent(objectIdOperator);
    const queryUrl = `https://umapsudp.momrah.gov.sa/server/rest/services/Umaps/Umaps_Click/MapServer/28/query?outFields=*&resultOffset=0&resultRecordCount=${resultRecordCount}&f=${fileType}&where=CITY_ID%3D'${cityId}'%20AND%20OBJECTID${operatorEncoded}${lastObjectIdRef.current}`;
    const url = useProxy
      ? `https://umaps.balady.gov.sa/newProxyUDP/proxy.ashx?${queryUrl}`
      : queryUrl;
    setBaseUrl(url);

    const response = await fetch(url);
    console.log("🚀 تم إرسال الطلب:", url);
    if (!response.ok) {
      throw new Error(`❌ فشل الاتصال بالملف، رمز الحالة: ${response.status}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const features = data.features;
      const firstFeature = features[0];
      const lastFeature = features[features.length - 1];
    
      console.log(`✅ ${cityName} - نجح جلب البيانات`);
      console.log("أول عنصر:", firstFeature);
      console.log("آخر عنصر:", lastFeature);
    
      // تحديث رقم آخر عنصر بناءً على آخر عنصر من البيانات
      let newLastId = lastFeature.id || lastFeature.properties?.OBJECTID;
      if (newLastId && newLastId !== lastObjectIdRef.current) {
        setLastObjectId(newLastId);
      }
      
      // تحميل الملف بعد نجاح استرجاع البيانات
      downloadGeoJSONFile(data);
    } else {
      console.log("⚠️ لم يتم العثور على عناصر جديدة");
    }
    

    // تحديث قائمة المعرّفات التي تم تنزيلها
    if (!downloadedIds.includes(lastObjectIdRef.current)) {
      setDownloadedIds((prevIds) => [...prevIds, lastObjectIdRef.current]);
    }

    return data;
  };

  // دالة حساب تأخير عشوائي (بالملي ثانية)
  const getRandomDelay = (min: number, max: number) => {
    const minMs = min * 1000;
    const maxMs = max * 1000;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  };

  // دالة التنزيل التلقائي مع مؤقت العد التنازلي
  const autoDownload = async () => {
    try {
      const data = await processDownload();
      if (data === null) {
        if (autoAdvance) {
          const delay = getRandomDelay(minDelay, maxDelay);
          startCountdownAndRetry(delay);
        }
        return;
      }
    } catch (error) {
      console.error("❌ حدث خطأ أثناء التنزيل التلقائي:", error);
      if (autoAdvance) {
        const delay = getRandomDelay(minDelay, maxDelay);
        startCountdownAndRetry(delay);
      }
      return;
    }
    if (autoAdvance) {
      const delay = getRandomDelay(minDelay, maxDelay);
      startCountdownAndRetry(delay);

    }
  };

  // دالة بدء العد التنازلي ثم إعادة محاولة التنزيل
  const startCountdownAndRetry = (delayMs: number) => {
    let secondsLeft = Math.floor(delayMs / 1000);
    setWaitingTime(secondsLeft);
    const countdown = setInterval(() => {
      if (!autoAdvance) {
        clearInterval(countdown);
        setWaitingTime(0);
        return;
      }
      secondsLeft--;
      setWaitingTime(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(countdown);
        autoDownload();
      }
    }, 1000);
  };

  // بدء التنزيل التلقائي عند تفعيل الخيار
  useEffect(() => {
    if (autoAdvance) {
      autoDownload();
    }
  }, [autoAdvance]);

  // إعادة تعيين مؤقت العد التنازلي عند إيقاف التنزيل التلقائي
  useEffect(() => {
    if (!autoAdvance) {
      setWaitingTime(0);
    }
  }, [autoAdvance]);


  // دالة تحميل ملف GeoJSON
const downloadGeoJSONFile = (data:any) => {
  // تحويل البيانات إلى سلسلة JSON
  const jsonString = JSON.stringify(data, null, 2);
  // إنشاء Blob من السلسلة مع تحديد نوع الملف
  const blob = new Blob([jsonString], { type: 'application/geo+json' });
  // إنشاء عنوان URL مؤقت للـ Blob
  const url = window.URL.createObjectURL(blob);
  // إنشاء عنصر رابط (anchor)
  const a = document.createElement('a');
  a.href = url;
  // تعيين اسم الملف (يمكنك تعديل الاسم حسب الحاجة)
  a.download = `${cityName}_${lastObjectIdRef.current}.geojson`;
  // إضافته إلى الصفحة (مطلوب لبعض المتصفحات)
  document.body.appendChild(a);
  // تفعيل النقر لتحميل الملف
  a.click();
  // إزالة العنصر بعد النقر وتنظيف الرابط المؤقت
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};


  return (
    <div className="py-2 px-4 bg-gray-100 border shadow-lg w-full h-full">
      <div className="flex flex-col gap-4">
        {/* الحقول الأساسية */}
        <div>
          <label className="block mb-1">code city</label>
          <input
            type="text"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            placeholder="أدخل معرف المدينة"
            className="p-2 w-full border"
          />
        </div>

        <div>
          <label className="block mb-1">اسم المدينة</label>
          <input
            type="text"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="أدخل اسم المدينة"
            className="p-2 w-full border"
          />
        </div>

        <div>
          <label className="block mb-1">نوع الملف</label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="p-2 w-full border"
          >
            <option value="geoJSON">GeoJSON</option>
            <option value="json">JSON</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">رقم آخر عنصر</label>
          <input
            type="number"
            value={lastObjectId}
            onChange={(e) => setLastObjectId(Number(e.target.value))}
            placeholder="أدخل رقم آخر عنصر"
            className="p-2 w-full border"
          />
        </div>

        <div>
          <label className="block mb-1">عامل المقارنة</label>
          <select
            value={objectIdOperator}
            onChange={(e) => setObjectIdOperator(e.target.value)}
            className="p-2 w-full border"
          >
            <option value=">">أكبر من</option>
            <option value=">=">أكبر من أو يساوي</option>
            <option value="<">أقل من</option>
            <option value="<=">أقل من أو يساوي</option>
            <option value="=">يساوي (=)</option>
            <option value="!=">لا يساوي (!=)</option>
            <option value="between">بين</option>
            <option value="not between">ليس بين</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">
            عدد السجلات (resultRecordCount)
          </label>
          <input
            type="number"
            value={resultRecordCount}
            onChange={(e) => setResultRecordCount(Number(e.target.value))}
            placeholder="أدخل عدد السجلات"
            className="p-2 w-full border"
          />
        </div>

        <div>
          <label className="block mb-1">الرابط الأساسي</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="الرابط يتم توليده تلقائياً"
            className="p-2 w-full border bg-gray-200"
            readOnly
          />
        </div>

        {/* إعدادات التنزيل التلقائي */}
        <div className="border p-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={useProxy}
              onChange={(e) => setUseProxy(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-dis">إضافة بروكسي إلى الرابط</span>
          </div>

          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="mr-2"
            />
            <span>تفعيل التنزيل التلقائي</span>
          </div>

          <div className="mt-2">
            <label className="block mb-1">الحد الأدنى للتأخير (ثواني)</label>
            <input
              type="number"
              value={minDelay}
              onChange={(e) => setMinDelay(Number(e.target.value))}
              placeholder="أدخل الحد الأدنى للتأخير"
              className="p-2 w-full border"
            />
          </div>
          <div className="mt-2">
            <label className="block mb-1">الحد الأقصى للتأخير (ثواني)</label>
            <input
              type="number"
              value={maxDelay}
              onChange={(e) => setMaxDelay(Number(e.target.value))}
              placeholder="أدخل الحد الأقصى للتأخير"
              className="p-2 w-full border"
            />
          </div>
          {autoAdvance && waitingTime > 0 && (
            <div className="mt-2 text-center text-sm text-blue-600">
              الانتظار: {waitingTime} ثانية...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




// import React, { useState, useEffect } from "react";

// export default function DownloadGeoJson() {
//   // الإعدادات الأساسية
//   const [useProxy, setUseProxy] = useState(false);
//   const [fileType, setFileType] = useState("geoJSON");
//   const [cityId, setCityId] = useState("00100001");
//   const [cityName, setCityName] = useState("المدينة");
//   const [lastObjectId, setLastObjectId] = useState("32512208");
//   const [objectIdOperator, setObjectIdOperator] = useState(">"); // عامل المقارنة
//   const [resultRecordCount, setResultRecordCount] = useState(2000);
//   const [baseUrl, setBaseUrl] = useState("");

//   // إعدادات التقدم التلقائي
//   const [autoAdvance, setAutoAdvance] = useState(false);
//   const [minDelay, setMinDelay] = useState(30);  // بالثواني
//   const [maxDelay, setMaxDelay] = useState(100); // بالثواني
//   const [waitingTime, setWaitingTime] = useState(0); // مؤقت الانتظار

//   // استرجاع الإعدادات من localStorage
//   useEffect(() => {
//     const savedFilter = localStorage.getItem("geoJsonFilter");
//     if (savedFilter) {
//       try {
//         const filter = JSON.parse(savedFilter);
//         setCityId(filter.cityId || cityId);
//         setCityName(filter.cityName || cityName);
//         setLastObjectId(filter.lastObjectId || lastObjectId);
//         setObjectIdOperator(filter.objectIdOperator || objectIdOperator);
//         setResultRecordCount(filter.resultRecordCount || resultRecordCount);
//         setFileType(filter.fileType || fileType);
//         setUseProxy(filter.useProxy || useProxy);
//         setAutoAdvance(filter.autoAdvance || autoAdvance);
//         setMinDelay(filter.minDelay || minDelay);
//         setMaxDelay(filter.maxDelay || maxDelay);
//       } catch (error) {
//         console.error("❌ خطأ في استعادة الإعدادات:", error);
//       }
//     }
//   }, []);

//   // تحديث الرابط الأساسي بناءً على الإعدادات
//   useEffect(() => {
//     const operatorEncoded = encodeURIComponent(objectIdOperator);
//     const url = `https://umapsudp.momrah.gov.sa/server/rest/services/Umaps/Umaps_Click/MapServer/28/query?where=CITY_ID%3D'${cityId}'%20AND%20OBJECTID${operatorEncoded}${lastObjectId}&outFields=*&resultOffset=0&resultRecordCount=${resultRecordCount}&f=${fileType}`;
//     setBaseUrl(url);
//   }, [cityId, lastObjectId, objectIdOperator, resultRecordCount, fileType]);

//   // حفظ الإعدادات في localStorage
//   const saveFilterToLocalStorage = () => {
//     const filter = {
//       cityId,
//       cityName,
//       lastObjectId,
//       objectIdOperator,
//       resultRecordCount,
//       fileType,
//       useProxy,
//       autoAdvance,
//       minDelay,
//       maxDelay,
//     };
//     localStorage.setItem("geoJsonFilter", JSON.stringify(filter));
//   };

//   // دالة لحساب تأخير عشوائي (بالملي ثانية)
//   const getRandomDelay = (min:number, max:number) => {
//     const minMs = min * 1000;
//     const maxMs = max * 1000;
//     return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
//   };

//   // الدالة الأساسية لتنفيذ الطلب وتحميل الملف
//   const processDownload = async () => {
//     if (!baseUrl) {
//       throw new Error("❌ يرجى إدخال رابط صالح");
//     }

//     // استرجاع المصفوفة من localStorage (أو إنشاء مصفوفة جديدة)
//     const storedDownloadedIds = localStorage.getItem("downloadedIds");
//     const downloadedIds = storedDownloadedIds ? JSON.parse(storedDownloadedIds) : [];

//     // التحقق من أن الطلب لم يُرسل من قبل بناءً على lastObjectId
//     if (downloadedIds.includes(lastObjectId)) {
//       console.log("⚠️ تم تنزيل البيانات مسبقاً لهذا المعرف:", lastObjectId);
//       return null; // تخطي الطلب
//     }

//     const finalUrl = useProxy
//       ? `https://umaps.balady.gov.sa/newProxyUDP/proxy.ashx?${baseUrl}`
//       : baseUrl;

//     const response = await fetch(finalUrl);
//     if (!response.ok) {
//       throw new Error(`❌ فشل الاتصال بالملف، رمز الحالة: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log("✅ تم استلام البيانات:", data);

//     let newLastObjectId = lastObjectId;
//     // تحديث معرف آخر عنصر إذا وُجدت بيانات جديدة
//     if (data.features && data.features.length > 0) {
//       const lastFeature = data.features[data.features.length - 1];
//       newLastObjectId = lastFeature.id || lastFeature.properties?.OBJECTID;
//       if (newLastObjectId === lastObjectId) {
//         console.log("⚠️ لا توجد بيانات جديدة لتحديث معرف آخر عنصر.");
//       } else {
//         setLastObjectId(newLastObjectId);
//       }
//     } else {
//       console.log("⚠️ لم يتم العثور على عناصر في البيانات");
//     }

//     // إضافة المعرف الحالي إلى المصفوفة وتخزينها في localStorage
//     if (!downloadedIds.includes(lastObjectId)) {
//       downloadedIds.push(lastObjectId);
//       localStorage.setItem("downloadedIds", JSON.stringify(downloadedIds));
//     }

//     saveFilterToLocalStorage();

//     const itemsCount = data.features ? data.features.length : 0;
//     const extension = fileType === "geoJSON" ? "geojson" : "json";
//     const filename = `${cityName}_${itemsCount}.${extension}`;

//     const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(jsonBlob);
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);

//     return data;
//   };

//   // تحميل الملف يدويًا
//   const downloadAndConvert = async () => {
//     try {
//       await processDownload();
//     } catch (error) {
//       console.error("❌ حدث خطأ أثناء التحميل:", error);
//     }
//   };

//   // دالة التنزيل التلقائي مع مؤقت الانتظار
//   const autoDownload = async () => {
//     try {
//       const data = await processDownload();
//       // إذا لم يتم تنزيل بيانات جديدة أو تم تخطي الطلب، ننتقل مباشرة للانتظار وإعادة المحاولة
//       if (data === null) {
//         if (autoAdvance) {
//           const delay = getRandomDelay(minDelay, maxDelay);
//           startCountdownAndRetry(delay);
//         }
//         return;
//       }
//     } catch (error) {
//       console.error("❌ حدث خطأ أثناء التنزيل التلقائي:", error);
//       if (autoAdvance) {
//         const delay = getRandomDelay(minDelay, maxDelay);
//         startCountdownAndRetry(delay);
//       }
//       return;
//     }
//     // بعد التنزيل الناجح، بدء الانتظار مع مؤقت قبل المحاولة التالية
//     if (autoAdvance) {
//       const delay = getRandomDelay(minDelay, maxDelay);
//       startCountdownAndRetry(delay);
//     }
//   };

//   // دالة لبدء العد التنازلي للانتظار ثم إعادة محاولة التنزيل
//   const startCountdownAndRetry = (delayMs:any) => {
//     let secondsLeft = Math.floor(delayMs / 1000);
//     setWaitingTime(secondsLeft);
//     const countdown = setInterval(() => {
//       // إذا تم إيقاف التقدم التلقائي أثناء العد التنازلي
//       if (!autoAdvance) {
//         clearInterval(countdown);
//         setWaitingTime(0);
//         return;
//       }
//       secondsLeft--;
//       setWaitingTime(secondsLeft);
//       if (secondsLeft <= 0) {
//         clearInterval(countdown);
//         autoDownload();
//       }
//     }, 1000);
//   };

//   // بدء التقدم التلقائي عند تفعيل الخيار
//   useEffect(() => {
//     if (autoAdvance) {
//       autoDownload();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [autoAdvance]);

//   // عند إيقاف التقدم التلقائي، إعادة تعيين مؤقت الانتظار
//   useEffect(() => {
//     if (!autoAdvance) {
//       setWaitingTime(0);
//     }
//   }, [autoAdvance]);

//   return (
//     <div className="py-2 px-4 bg-gray-100 border shadow-lg w-full h-full">
//       <div className="flex flex-col gap-4">
//         {/* استخدام البروكسي */}
//         <div className="flex items-center">
//           <input
//             type="checkbox"
//             checked={useProxy}
//             onChange={(e) => setUseProxy(e.target.checked)}
//             className="mr-2"
//           />
//           <span className="text-sm text-dis">إضافة بروكسي إلى الرابط</span>
//         </div>

//         {/* معرف المدينة */}
//         <div>
//           <label className="block mb-1">code city</label>
//           <input
//             type="text"
//             value={cityId}
//             onChange={(e) => setCityId(e.target.value)}
//             placeholder="أدخل معرف المدينة"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* اسم المدينة */}
//         <div>
//           <label className="block mb-1">اسم المدينة</label>
//           <input
//             type="text"
//             value={cityName}
//             onChange={(e) => setCityName(e.target.value)}
//             placeholder="أدخل اسم المدينة"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* نوع الملف */}
//         <div>
//           <label className="block mb-1">نوع الملف</label>
//           <select
//             value={fileType}
//             onChange={(e) => setFileType(e.target.value)}
//             className="p-2 w-full border"
//           >
//             <option value="geoJSON">GeoJSON</option>
//             <option value="json">JSON</option>
//           </select>
//         </div>

//         {/* رقم آخر عنصر */}
//         <div>
//           <label className="block mb-1">رقم آخر عنصر</label>
//           <input
//             type="number"
//             value={lastObjectId}
//             onChange={(e) => setLastObjectId(e.target.value)}
//             placeholder="أدخل رقم آخر عنصر"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* عامل المقارنة */}
//         <div>
//           <label className="block mb-1">عامل المقارنة</label>
//           <select
//             value={objectIdOperator}
//             onChange={(e) => setObjectIdOperator(e.target.value)}
//             className="p-2 w-full border"
//           >
//             <option value=">">أكبر من</option>
//             <option value=">=">أكبر من أو يساوي</option>
//             <option value="<">أقل من</option>
//             <option value="<=">أقل من أو يساوي</option>
//             <option value="=">يساوي (=)</option>
//             <option value="!=">لا يساوي (!=)</option>
//             <option value="between">بين</option>
//             <option value="not between">ليس بين</option>
//           </select>
//         </div>

//         {/* عدد السجلات */}
//         <div>
//           <label className="block mb-1">عدد السجلات (resultRecordCount)</label>
//           <input
//             type="number"
//             value={resultRecordCount}
//             onChange={(e) => setResultRecordCount(Number(e.target.value))}
//             placeholder="أدخل عدد السجلات"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* عرض الرابط الأساسي */}
//         <div>
//           <label className="block mb-1">الرابط الأساسي</label>
//           <input
//             type="text"
//             value={baseUrl}
//             onChange={(e) => setBaseUrl(e.target.value)}
//             placeholder="الرابط يتم توليده تلقائياً"
//             className="p-2 w-full border bg-gray-200"
//             readOnly
//           />
//         </div>

//         {/* إعدادات التقدم التلقائي */}
//         <div className="border p-2">
//           <div className="flex items-center">
//             <input
//               type="checkbox"
//               checked={autoAdvance}
//               onChange={(e) => setAutoAdvance(e.target.checked)}
//               className="mr-2"
//             />
//             <span>تفعيل التقدم التلقائي بعد كل طلب</span>
//           </div>
//           <div className="mt-2">
//             <label className="block mb-1">الحد الأدنى للتأخير (ثواني)</label>
//             <input
//               type="number"
//               value={minDelay}
//               onChange={(e) => setMinDelay(Number(e.target.value))}
//               placeholder="أدخل الحد الأدنى للتأخير"
//               className="p-2 w-full border"
//             />
//           </div>
//           <div className="mt-2">
//             <label className="block mb-1">الحد الأقصى للتأخير (ثواني)</label>
//             <input
//               type="number"
//               value={maxDelay}
//               onChange={(e) => setMaxDelay(Number(e.target.value))}
//               placeholder="أدخل الحد الأقصى للتأخير"
//               className="p-2 w-full border"
//             />
//           </div>
//           {/* عرض مؤقت الانتظار على الشاشة */}
//           {autoAdvance && waitingTime > 0 && (
//             <div className="mt-2 text-center text-sm text-blue-600">
//               الانتظار: {waitingTime} ثانية...
//             </div>
//           )}
//         </div>

//         <button
//           onClick={downloadAndConvert}
//           className="bg-bl text-white p-2 rounded hover:bg-bl"
//         >
//           تحميل وتنزيل الملف
//         </button>
//       </div>
//     </div>
//   );
// }






// import React, { useState, useEffect } from "react";

// export default function DownloadGeoJson() {
//   // الإعدادات الأساسية
//   const [useProxy, setUseProxy] = useState(false);
//   const [fileType, setFileType] = useState("geoJSON");
//   const [cityId, setCityId] = useState("00100001");
//   const [cityName, setCityName] = useState("المدينة");
//   const [lastObjectId, setLastObjectId] = useState("32512208");
//   const [objectIdOperator, setObjectIdOperator] = useState(">"); // عامل المقارنة
//   const [resultRecordCount, setResultRecordCount] = useState(2000);
//   const [baseUrl, setBaseUrl] = useState("");

//   // إعدادات التقدم التلقائي
//   const [autoAdvance, setAutoAdvance] = useState(false);
//   const [minDelay, setMinDelay] = useState(30);  // بالثواني (افتراضي 30 ثانية)
//   const [maxDelay, setMaxDelay] = useState(100); // بالثواني (افتراضي 1 دقيقة و40 ثانية)

//   // عند التحميل، استعادة الإعدادات من localStorage إن وُجدت
//   useEffect(() => {
//     const savedFilter = localStorage.getItem("geoJsonFilter");
//     if (savedFilter) {
//       try {
//         const filter = JSON.parse(savedFilter);
//         setCityId(filter.cityId || cityId);
//         setCityName(filter.cityName || cityName);
//         setLastObjectId(filter.lastObjectId || lastObjectId);
//         setObjectIdOperator(filter.objectIdOperator || objectIdOperator);
//         setResultRecordCount(filter.resultRecordCount || resultRecordCount);
//         setFileType(filter.fileType || fileType);
//         setUseProxy(filter.useProxy || useProxy);
//         setAutoAdvance(filter.autoAdvance || autoAdvance);
//         setMinDelay(filter.minDelay || minDelay);
//         setMaxDelay(filter.maxDelay || maxDelay);
//       } catch (error) {
//         console.error("❌ خطأ في استعادة الإعدادات:", error);
//       }
//     }
//   }, []);

//   // تحديث الرابط الأساسي تلقائيًا بناءً على الإعدادات
//   useEffect(() => {
//     const operatorEncoded = encodeURIComponent(objectIdOperator);
//     const url = `https://umapsudp.momrah.gov.sa/server/rest/services/Umaps/Umaps_Click/MapServer/28/query?where=CITY_ID%3D'${cityId}'%20AND%20OBJECTID${operatorEncoded}${lastObjectId}&outFields=*&resultOffset=0&resultRecordCount=${resultRecordCount}&f=${fileType}`;
//     setBaseUrl(url);
//   }, [cityId, lastObjectId, objectIdOperator, resultRecordCount, fileType]);

//   // حفظ الإعدادات في localStorage
//   const saveFilterToLocalStorage = () => {
//     const filter = {
//       cityId,
//       cityName,
//       lastObjectId,
//       objectIdOperator,
//       resultRecordCount,
//       fileType,
//       useProxy,
//       autoAdvance,
//       minDelay,
//       maxDelay,
//     };
//     localStorage.setItem("geoJsonFilter", JSON.stringify(filter));
//   };

//   // دالة لحساب تأخير عشوائي بين الحدين (بالملي ثانية)
//   const getRandomDelay = (min:number, max:number) => {
//     const minMs = min * 1000;
//     const maxMs = max * 1000;
//     return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
//   };

//   // الدالة الأساسية لتنفيذ الطلب وتحميل الملف
//   const processDownload = async () => {
//     if (!baseUrl) {
//       throw new Error("❌ يرجى إدخال رابط صالح");
//     }

//     const finalUrl = useProxy
//       ? `https://umaps.balady.gov.sa/newProxyUDP/proxy.ashx?${baseUrl}`
//       : baseUrl;

//     const response = await fetch(finalUrl);
//     if (!response.ok) {
//       throw new Error(`❌ فشل الاتصال بالملف، رمز الحالة: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log("✅ تم استلام البيانات:", data);

//     // استخراج معرف العنصر من آخر ميزة إن وُجدت
//     if (data.features && data.features.length > 0) {
//       const lastFeature = data.features[data.features.length - 1];
//       const newLastObjectId =
//         lastFeature.id || lastFeature.properties?.OBJECTID;
//       setLastObjectId(newLastObjectId);
//     } else {
//       console.log("⚠️ لم يتم العثور على عناصر في البيانات");
//     }

//     saveFilterToLocalStorage();

//     const itemsCount = data.features ? data.features.length : 0;
//     const extension = fileType === "geoJSON" ? "geojson" : "json";
//     const filename = `${cityName}_${itemsCount}.${extension}`;

//     const jsonBlob = new Blob(
//       [JSON.stringify(data, null, 2)],
//       { type: "application/json" }
//     );
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(jsonBlob);
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   // زر التحميل اليدوي
//   const downloadAndConvert = async () => {
//     try {
//       await processDownload();
//     } catch (error) {
//       console.error("❌ حدث خطأ أثناء التحميل:", error);
//     }
//   };

//   // دالة التقدم التلقائي مع التعامل مع الأخطاء
//   const autoDownload = async () => {
//     try {
//       await processDownload();
//       const delay = getRandomDelay(minDelay, maxDelay);
//       console.log(`⏳ سيتم تكرار العملية بعد ${delay / 1000} ثانية`);
//       setTimeout(() => {
//         if (autoAdvance) autoDownload();
//       }, delay);
//     } catch (error) {
//       console.error("❌ حدث خطأ أثناء التحميل:", error);
//         console.log("🔄 حصل خطأ 500، الانتظار 5 ثواني قبل إعادة المحاولة");
//         const delay = getRandomDelay(minDelay, maxDelay);
//         console.log(`⏳ سيتم تكرار العملية بعد ${delay / 1000} ثانية`);
//         setTimeout(() => {
//           if (autoAdvance) autoDownload();
//         }, delay);
//       }
//   };

//   // بدء التقدم التلقائي عند تفعيل الخيار
//   useEffect(() => {
//     if (autoAdvance) {
//       autoDownload();
//     }
//     // لا نقوم بإضافة autoDownload إلى المصفوفة لتفادي تكرار الاستدعاءات
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [autoAdvance]);

//   return (
//     <div className="py-2 px-4 bg-gray-100 border shadow-lg w-full h-full">
//       <div className="flex flex-col gap-4">
//         {/* استخدام البروكسي */}
//         <div className="flex items-center">
//           <input
//             type="checkbox"
//             checked={useProxy}
//             onChange={(e) => setUseProxy(e.target.checked)}
//             className="mr-2"
//           />
//           <span className="text-sm text-dis">إضافة بروكسي إلى الرابط</span>
//         </div>

//         {/* معرف المدينة */}
//         <div>
//           <label className="block mb-1">code city</label>
//           <input
//             type="text"
//             value={cityId}
//             onChange={(e) => setCityId(e.target.value)}
//             placeholder="أدخل معرف المدينة"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* اسم المدينة */}
//         <div>
//           <label className="block mb-1">اسم المدينة</label>
//           <input
//             type="text"
//             value={cityName}
//             onChange={(e) => setCityName(e.target.value)}
//             placeholder="أدخل اسم المدينة"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* نوع الملف */}
//         <div>
//           <label className="block mb-1">نوع الملف</label>
//           <select
//             value={fileType}
//             onChange={(e) => setFileType(e.target.value)}
//             className="p-2 w-full border"
//           >
//             <option value="geoJSON">GeoJSON</option>
//             <option value="json">JSON</option>
//           </select>
//         </div>

//         {/* رقم آخر عنصر */}
//         <div>
//           <label className="block mb-1">رقم آخر عنصر </label>
//           <input
//             type="number"
//             value={lastObjectId}
//             onChange={(e) => setLastObjectId(e.target.value)}
//             placeholder="أدخل رقم آخر عنصر"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* عامل المقارنة */}
//         <div>
//           <label className="block mb-1">عامل المقارنة</label>
//           <select
//             value={objectIdOperator}
//             onChange={(e) => setObjectIdOperator(e.target.value)}
//             className="p-2 w-full border"
//           >
//             <option value="&gt;">أكبر من (&gt;)</option>
//             <option value="&gt;=">أكبر من أو يساوي (&gt;=)</option>
//             <option value="&lt;">أقل من (&lt;)</option>
//             <option value="&lt;=">أقل من أو يساوي (&lt;=)</option>
//             <option value=">">أكبر من (>)</option>
//             <option value=">=">أكبر من أو يساوي (>=)</option>
//             <option value="<">أقل من (<)</option>
//             <option value="<=">أقل من أو يساوي (<=)</option>
//             <option value="=">يساوي (=)</option>
//             <option value="!=">لا يساوي (!=)</option>

//           </select>
//         </div>

//         {/* عدد السجلات */}
//         <div>
//           <label className="block mb-1">عدد السجلات (resultRecordCount)</label>
//           <input
//             type="number"
//             value={resultRecordCount}
//             onChange={(e) => setResultRecordCount(Number(e.target.value))}
//             placeholder="أدخل عدد السجلات"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* عرض الرابط الأساسي */}
//         <div>
//           <label className="block mb-1">الرابط الأساسي</label>
//           <input
//             type="text"
//             value={baseUrl}
//             onChange={(e) => setBaseUrl(e.target.value)}
//             placeholder="الرابط يتم توليده تلقائياً"
//             className="p-2 w-full border bg-gray-200"
//             readOnly
//           />
//         </div>

//         {/* إعدادات التقدم التلقائي */}
//         <div className="border p-2">
//           <div className="flex items-center">
//             <input
//               type="checkbox"
//               checked={autoAdvance}
//               onChange={(e) => setAutoAdvance(e.target.checked)}
//               className="mr-2"
//             />
//             <span>تفعيل التقدم التلقائي بعد كل طلب</span>
//           </div>
//           <div className="mt-2">
//             <label className="block mb-1">الحد الأدنى للتأخير (ثواني)</label>
//             <input
//               type="number"
//               value={minDelay}
//               onChange={(e) => setMinDelay(Number(e.target.value))}
//               placeholder="أدخل الحد الأدنى للتأخير"
//               className="p-2 w-full border"
//             />
//           </div>
//           <div className="mt-2">
//             <label className="block mb-1">الحد الأقصى للتأخير (ثواني)</label>
//             <input
//               type="number"
//               value={maxDelay}
//               onChange={(e) => setMaxDelay(Number(e.target.value))}
//               placeholder="أدخل الحد الأقصى للتأخير"
//               className="p-2 w-full border"
//             />
//           </div>
//         </div>

//         <button
//           onClick={downloadAndConvert}
//           className="bg-bl text-white p-2 rounded hover:bg-bl"
//         >
//           تحميل وتنزيل الملف
//         </button>
//       </div>
//     </div>
//   );
// }












// import React, { useState, useEffect } from "react";

// export default function DownloadGeoJson() {
//   // تحميل الإعدادات من localStorage إن وجدت
//   const [useProxy, setUseProxy] = useState(false);
//   const [fileType, setFileType] = useState("geoJSON");
//   const [cityId, setCityId] = useState("00100001");
//   const [cityName, setCityName] = useState("المدينة");
//   const [lastObjectId, setLastObjectId] = useState("32512208");
//   const [resultRecordCount, setResultRecordCount] = useState(2000);
//   const [baseUrl, setBaseUrl] = useState("");

//   // عند التحميل، نحاول استعادة الإعدادات من localStorage
//   useEffect(() => {
//     const savedFilter = localStorage.getItem("geoJsonFilter");
//     if (savedFilter) {
//       try {
//         const filter = JSON.parse(savedFilter);
//         setCityId(filter.cityId || cityId);
//         setCityName(filter.cityName || cityName);
//         setLastObjectId(filter.lastObjectId || lastObjectId);
//         setResultRecordCount(filter.resultRecordCount || resultRecordCount);
//         setFileType(filter.fileType || fileType);
//         setUseProxy(filter.useProxy || useProxy);
//       } catch (error) {
//         console.error("❌ خطأ في استعادة الإعدادات:", error);
//       }
//     }
//   }, []);

//   // تحديث الرابط الأساسي تلقائيًا بناءً على الإعدادات
//   useEffect(() => {
//     const url = `https://umapsudp.momrah.gov.sa/server/rest/services/Umaps/Umaps_Click/MapServer/28/query?where=CITY_ID%3D'${cityId}'%20AND%20OBJECTID%3E${lastObjectId}&outFields=*&resultOffset=0&resultRecordCount=${resultRecordCount}&f=${fileType}`;
//     setBaseUrl(url);
//   }, [cityId, lastObjectId, resultRecordCount, fileType]);

//   // دالة لحفظ إعدادات الفلتر في localStorage
//   const saveFilterToLocalStorage = () => {
//     const filter = { cityId, cityName, lastObjectId, resultRecordCount, fileType, useProxy };
//     localStorage.setItem("geoJsonFilter", JSON.stringify(filter));
//   };

//   const downloadAndConvert = async () => {
//     if (!baseUrl) {
//       console.error("❌ يرجى إدخال رابط صالح");
//       return;
//     }

//     // استخدام البروكسي إن تم تفعيله
//     const finalUrl = useProxy
//       ? `https://umaps.balady.gov.sa/newProxyUDP/proxy.ashx?${baseUrl}`
//       : baseUrl;

//     try {
//       const response = await fetch(finalUrl);
//       if (!response.ok) {
//         throw new Error(`❌ فشل الاتصال بالملف، رمز الحالة: ${response.status}`);
//       }

//       const data = await response.json();
//       console.log("✅ تم استلام البيانات:", data);

//       // استخراج معرف العنصر من آخر ميزة في البيانات
//       if (data.features && data.features.length > 0) {
//         const lastFeature = data.features[data.features.length - 1];
//         const newLastObjectId =
//           lastFeature.id || lastFeature.properties?.OBJECTID;
//         setLastObjectId(newLastObjectId);
//       }

//       // حفظ إعدادات الفلتر في localStorage
//       saveFilterToLocalStorage();

//       // إعداد اسم الملف باستخدام اسم المدينة وعدد العناصر
//       const itemsCount = data.features ? data.features.length : 0;
//       const extension = fileType === "geoJSON" ? "geojson" : "json";
//       const filename = `${cityName}_${itemsCount}.${extension}`;

//       // تحويل البيانات إلى Blob وتنزيل الملف
//       const jsonBlob = new Blob(
//         [JSON.stringify(data, null, 2)],
//         { type: "application/json" }
//       );
//       const link = document.createElement("a");
//       link.href = URL.createObjectURL(jsonBlob);
//       link.download = filename;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     } catch (error) {
//       console.error("❌ حدث خطأ أثناء التحميل:", error);
//     }
//   };

//   return (
//     <div className="py-2 px-4 bg-gray-100 border shadow-lg w-full h-full">
//       <div className="flex flex-col gap-4">
//         {/* استخدام البروكسي */}
//         <div className="flex items-center">
//           <input
//             type="checkbox"
//             checked={useProxy}
//             onChange={(e) => setUseProxy(e.target.checked)}
//             className="mr-2"
//           />
//           <span>إضافة بروكسي إلى الرابط</span>
//         </div>

//         {/* معرف المدينة */}
//         <div>
//           <label className="block mb-1">معرف المدينة</label>
//           <input
//             type="text"
//             value={cityId}
//             onChange={(e) => setCityId(e.target.value)}
//             placeholder="أدخل معرف المدينة"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* اسم المدينة */}
//         <div>
//           <label className="block mb-1">اسم المدينة</label>
//           <input
//             type="text"
//             value={cityName}
//             onChange={(e) => setCityName(e.target.value)}
//             placeholder="أدخل اسم المدينة"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* نوع الملف */}
//         <div>
//           <label className="block mb-1">نوع الملف</label>
//           <select
//             value={fileType}
//             onChange={(e) => setFileType(e.target.value)}
//             className="p-2 w-full border"
//           >
//             <option value="geoJSON">GeoJSON</option>
//             <option value="json">JSON</option>
//           </select>
//         </div>

//         {/* رقم آخر عنصر */}
//         <div>
//           <label className="block mb-1">رقم آخر عنصر (OBJECTID)</label>
//           <input
//             type="number"
//             value={lastObjectId}
//             onChange={(e) => setLastObjectId(e.target.value)}
//             placeholder="أدخل رقم آخر عنصر"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* عدد السجلات */}
//         <div>
//           <label className="block mb-1">عدد السجلات (resultRecordCount)</label>
//           <input
//             type="number"
//             value={resultRecordCount}
//             onChange={(e) => setResultRecordCount(Number(e.target.value))}
//             placeholder="أدخل عدد السجلات"
//             className="p-2 w-full border"
//           />
//         </div>

//         {/* عرض الرابط الأساسي */}
//         <div>
//           <label className="block mb-1">الرابط الأساسي</label>
//           <input
//             type="text"
//             value={baseUrl}
//             onChange={(e) => setBaseUrl(e.target.value)}
//             placeholder="الرابط يتم توليده تلقائياً"
//             className="p-2 w-full border bg-gray-200"
//             readOnly
//           />
//         </div>

//         <button
//           onClick={downloadAndConvert}
//           className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
//         >
//           تحميل وتنزيل الملف
//         </button>
//       </div>
//     </div>
//   );
// }


