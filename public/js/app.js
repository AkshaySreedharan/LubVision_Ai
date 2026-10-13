/* ============================================================
   LOOB VISION AI - REACT + REACT BOOTSTRAP INDUSTRIAL UI
   ============================================================ */

const { useState, useEffect, useRef } = React;
const {
  Container, Row, Col, Card, Button, Navbar, Badge,
  Form, Spinner, Accordion, Alert, Table, Stack, Modal
} = ReactBootstrap;

// ============================================================
// HEADER COMPONENT
// ============================================================
function Header({ modelStatus, selectedModel, onModelChange }) {
  return (
    <Navbar className="loob-navbar sticky-top">
      <Container fluid className="px-3 px-md-4">
        <Navbar.Brand href="#" className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center"
               style={{
                 width: '40px',
                 height: '40px',
                 borderRadius: '10px',
                 background: 'linear-gradient(135deg, #00b8d9 0%, #0066cc 100%)',
                 boxShadow: '0 0 15px rgba(0,184,217,0.4)',
                 color: '#fff'
               }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
          <div>
            <div className="loob-brand-title">LUBVISION</div>
            <div className="loob-brand-subtitle">AI-Powered Lubricant Condition Analysis</div>
          </div>
        </Navbar.Brand>

        <div className="d-flex align-items-center gap-3 ms-auto mt-2 mt-sm-0">
          <Form.Select 
            className="loob-model-select"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="Original Image Model">Select Model: Original Image Model</option>
          </Form.Select>

          <span className="loob-status-badge">
            <span className="pulse-dot" style={{ background: '#00c98d', boxShadow: '0 0 8px #00c98d' }}></span>
            Model Ready
          </span>
        </div>
      </Container>
    </Navbar>
  );
}

// ============================================================
// INTERACTIVE IMAGE CROPPER COMPONENT
// ============================================================
function ImageCropper({ imageSrc, onApply, onCancel, onReset }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 }); // Percentage (0-100)
  const [dragState, setDragState] = useState(null);

  const handleReset = () => {
    setCrop({ x: 10, y: 10, width: 80, height: 80 });
    if (onReset) onReset();
  };

  const startDrag = (mode, e) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragState({
      mode,
      startX: clientX,
      startY: clientY,
      initialCrop: { ...crop }
    });
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragState || !containerRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPercent = ((clientX - dragState.startX) / rect.width) * 100;
      const deltaYPercent = ((clientY - dragState.startY) / rect.height) * 100;

      const init = dragState.initialCrop;
      let newCrop = { ...crop };

      if (dragState.mode === 'move') {
        newCrop.x = Math.max(0, Math.min(100 - init.width, init.x + deltaXPercent));
        newCrop.y = Math.max(0, Math.min(100 - init.height, init.y + deltaYPercent));
      } else if (dragState.mode === 'tl') {
        const newX = Math.max(0, Math.min(init.x + init.width - 15, init.x + deltaXPercent));
        const newY = Math.max(0, Math.min(init.y + init.height - 15, init.y + deltaYPercent));
        newCrop.width = init.width + (init.x - newX);
        newCrop.height = init.height + (init.y - newY);
        newCrop.x = newX;
        newCrop.y = newY;
      } else if (dragState.mode === 'tr') {
        const newY = Math.max(0, Math.min(init.y + init.height - 15, init.y + deltaYPercent));
        const newW = Math.max(15, Math.min(100 - init.x, init.width + deltaXPercent));
        newCrop.height = init.height + (init.y - newY);
        newCrop.y = newY;
        newCrop.width = newW;
      } else if (dragState.mode === 'bl') {
        const newX = Math.max(0, Math.min(init.x + init.width - 15, init.x + deltaXPercent));
        const newH = Math.max(15, Math.min(100 - init.y, init.height + deltaYPercent));
        newCrop.width = init.width + (init.x - newX);
        newCrop.x = newX;
        newCrop.height = newH;
      } else if (dragState.mode === 'br') {
        const newW = Math.max(15, Math.min(100 - init.x, init.width + deltaXPercent));
        const newH = Math.max(15, Math.min(100 - init.y, init.height + deltaYPercent));
        newCrop.width = newW;
        newCrop.height = newH;
      }

      setCrop(newCrop);
    };

    const handleEnd = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragState, crop]);

  const applyCrop = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    const cropX = (crop.x / 100) * img.naturalWidth;
    const cropY = (crop.y / 100) * img.naturalHeight;
    const cropW = (crop.width / 100) * img.naturalWidth;
    const cropH = (crop.height / 100) * img.naturalHeight;

    if (cropW < 10 || cropH < 10) {
      console.warn("Crop selection too small");
      return;
    }

    const maxDim = 800;
    let outW = cropW;
    let outH = cropH;

    if (Math.max(cropW, cropH) > maxDim) {
      if (cropW >= cropH) {
        outW = maxDim;
        outH = Math.round((cropH * maxDim) / cropW);
      } else {
        outH = maxDim;
        outW = Math.round((cropW * maxDim) / cropH);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const origKb = Math.round((imageSrc.length * 0.75) / 1024);
    const croppedKb = Math.round((croppedDataUrl.length * 0.75) / 1024);

    console.log("[LOOB CROP] Original dimensions:", `${img.naturalWidth} x ${img.naturalHeight} (${origKb} KB)`);
    console.log("[LOOB CROP] Cropped selection  :", `${Math.round(cropW)} x ${Math.round(cropH)}`);
    console.log("[LOOB CROP] Final upload image :", `${outW} x ${outH} (${croppedKb} KB)`);

    onApply(croppedDataUrl);
  };

  return (
    <div className="d-flex flex-column h-100 justify-content-between">
      <div className="cropper-wrapper mb-3" ref={containerRef}>
        <div className="cropper-img-container">
          <img ref={imgRef} src={imageSrc} className="cropper-img" alt="Crop target" />
          <div className="cropper-backdrop"></div>

          <div 
            className="crop-box" 
            style={{
              left: `${crop.x}%`,
              top: `${crop.y}%`,
              width: `${crop.width}%`,
              height: `${crop.height}%`
            }}
            onMouseDown={(e) => startDrag('move', e)}
            onTouchStart={(e) => startDrag('move', e)}
          >
            <div className="crop-badge">SELECT LUBRICANT REGION</div>
            <div className="crop-handle crop-handle-tl" onMouseDown={(e) => startDrag('tl', e)} onTouchStart={(e) => startDrag('tl', e)}></div>
            <div className="crop-handle crop-handle-tr" onMouseDown={(e) => startDrag('tr', e)} onTouchStart={(e) => startDrag('tr', e)}></div>
            <div className="crop-handle crop-handle-bl" onMouseDown={(e) => startDrag('bl', e)} onTouchStart={(e) => startDrag('bl', e)}></div>
            <div className="crop-handle crop-handle-br" onMouseDown={(e) => startDrag('br', e)} onTouchStart={(e) => startDrag('br', e)}></div>
          </div>
        </div>
      </div>

      <Stack direction="horizontal" gap={2} className="justify-content-center">
        <Button className="btn-loob-secondary flex-fill" onClick={handleReset}>
          <span className="me-1">↺</span> Reset
        </Button>
        <Button className="btn-loob-secondary flex-fill" onClick={onCancel}>
          <span className="me-1">✕</span> Cancel
        </Button>
        <Button className="btn-loob-primary flex-fill" onClick={applyCrop}>
          <span className="me-1">✓</span> Apply Crop
        </Button>
      </Stack>
    </div>
  );
}

// ============================================================
// CAMERA ACCESS & PERMISSION POPUP MODAL COMPONENT
// ============================================================
function CameraAccessModal({
  show,
  onHide,
  statusType,
  cameraError,
  onRetry,
  onUploadClick
}) {
  const isDenied = statusType === 'denied';
  const isNotFound = statusType === 'not_found';
  const isInUse = statusType === 'in_use';

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className="loob-camera-modal"
      backdrop="static"
      keyboard={true}
    >
      <Modal.Header closeButton>
        <div className="d-flex align-items-center gap-2">
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: isDenied ? 'rgba(245, 166, 35, 0.15)' : 'rgba(0, 184, 217, 0.15)',
            border: `1px solid ${isDenied ? 'rgba(245, 166, 35, 0.45)' : 'rgba(0, 184, 217, 0.45)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDenied ? '#f5a623' : '#00b8d9'
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div>
            <div className="fw-bold" style={{ fontSize: '0.95rem', letterSpacing: '0.5px' }}>
              {isDenied ? 'CAMERA PERMISSION REQUIRED' : 'DEVICE CAMERA ACCESS'}
            </div>
            <div className="small text-muted" style={{ fontSize: '0.72rem' }}>
              LUBRICANT OPTICAL INSPECTION SYSTEM
            </div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        <div className="camera-modal-hero">
          <div className={`camera-modal-icon-wrapper ${isDenied ? 'warning' : ''}`}>
            <div className="pulse-ring"></div>
            {isDenied ? (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            ) : isNotFound ? (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00b8d9" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            ) : (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00b8d9" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </div>

          <div className="camera-modal-title">
            {isDenied
              ? "Camera Access Was Blocked"
              : isNotFound
              ? "No Camera Hardware Detected"
              : isInUse
              ? "Camera Is Currently In Use"
              : "Enable Live Lubricant Camera"}
          </div>

          <div className="camera-modal-subtitle">
            {isDenied
              ? "Your web browser blocked camera permissions for this site. To capture real-time oil samples, please allow camera access."
              : isNotFound
              ? "We could not find an active built-in webcam or external USB video device. You can easily analyze samples by uploading a photo."
              : isInUse
              ? "Another program (like Zoom, Teams, or another browser window) is using your webcam. Please close it and retry."
              : "Allow camera access to inspect fluid samples with real-time Square ROI positioning and automatic lighting verification."}
          </div>

          {isDenied ? (
            <div className="camera-instruction-box">
              <div className="fw-semibold text-light small mb-2 text-uppercase" style={{ letterSpacing: '0.8px' }}>
                How to Enable in Browser:
              </div>
              <div className="camera-instruction-step">
                <div className="camera-step-number">1</div>
                <div className="camera-step-text">
                  Look at your browser's address bar at the top of the window and click the <strong>Lock 🔒</strong> or <strong>Site Controls 🎛️</strong> icon next to the URL.
                </div>
              </div>
              <div className="camera-instruction-step">
                <div className="camera-step-number">2</div>
                <div className="camera-step-text">
                  Find <strong>Camera</strong> in the permissions list and switch it to <strong>Allow</strong>.
                </div>
              </div>
              <div className="camera-instruction-step">
                <div className="camera-step-number">3</div>
                <div className="camera-step-text">
                  Click the <strong>Retry Camera Access</strong> button below to activate your live feed.
                </div>
              </div>
            </div>
          ) : (
            <div className="camera-feature-grid">
              <div className="camera-feature-pill">
                <div className="camera-feature-pill-icon">🎯</div>
                <div className="fw-semibold text-light mb-1">Square ROI Guide</div>
                <div>Align oil droplets accurately for optimal feature extraction</div>
              </div>
              <div className="camera-feature-pill">
                <div className="camera-feature-pill-icon">⚡</div>
                <div className="fw-semibold text-light mb-1">Instant Screening</div>
                <div>Rapid one-click capture with automated size scaling</div>
              </div>
              <div className="camera-feature-pill">
                <div className="camera-feature-pill-icon">🔒</div>
                <div className="fw-semibold text-light mb-1">Device Privacy</div>
                <div>Video streams are captured securely on your local device</div>
              </div>
            </div>
          )}
        </div>

        <div className="d-flex flex-column gap-2 mt-4">
          <Button
            className="btn-loob-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
            onClick={onRetry}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span>{isDenied ? '↻ Retry Camera Access' : 'Enable Camera Access'}</span>
          </Button>

          <Button
            className="btn-loob-secondary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
            onClick={onUploadClick}
          >
            <span>📁 Upload Sample Photo Instead</span>
          </Button>

          <Button
            variant="link"
            className="text-muted text-decoration-none small py-1 mt-1"
            onClick={onHide}
          >
            Dismiss
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}

// ============================================================
// CAMERA / IMAGE PREVIEW & CROP PANEL
// ============================================================
function CameraPanel({
  capturedImage,
  onCapture,
  onUpload,
  onRetake,
  onAnalyze,
  isAnalyzing
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraStatusType, setCameraStatusType] = useState('standby'); // 'standby', 'denied', 'not_found', 'in_use', 'general'
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [uncroppedImage, setUncroppedImage] = useState(null);

  useEffect(() => {
    if (!capturedImage) {
      startCamera(false);
      setIsCropping(false);
      setUncroppedImage(null);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [capturedImage]);

  const startCamera = async (openModalOnFailure = false) => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MEDIA_UNSUPPORTED");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        setShowCameraModal(false);
        setCameraError(null);
        setCameraStatusType('active');
      }
    } catch (err) {
      console.warn("Camera access warning:", err);
      setCameraActive(false);

      let statusType = 'general';
      let message = "Camera feed offline. Enable camera permissions or upload an image.";

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        statusType = 'denied';
        message = "Camera access was denied by browser permissions.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        statusType = 'not_found';
        message = "No physical camera capture hardware was detected.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        statusType = 'in_use';
        message = "Camera is currently in use by another application.";
      } else if (err.message === 'MEDIA_UNSUPPORTED') {
        statusType = 'unsupported';
        message = "Camera API requires a secure connection (HTTPS or localhost).";
      }

      setCameraStatusType(statusType);
      setCameraError(message);

      if (openModalOnFailure) {
        setShowCameraModal(true);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleRequestCamera = () => {
    startCamera(true);
  };

  const handleCaptureClick = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const rawWidth = video.videoWidth || 640;
      const rawHeight = video.videoHeight || 480;

      const maxDim = 800;
      let targetWidth = rawWidth;
      let targetHeight = rawHeight;

      if (Math.max(rawWidth, rawHeight) > maxDim) {
        if (rawWidth >= rawHeight) {
          targetWidth = maxDim;
          targetHeight = Math.round((rawHeight * maxDim) / rawWidth);
        } else {
          targetHeight = maxDim;
          targetWidth = Math.round((rawWidth * maxDim) / rawHeight);
        }
      }

      const canvas = canvasRef.current;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setUncroppedImage(dataUrl);
      onCapture(dataUrl);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let targetWidth = img.width;
          let targetHeight = img.height;

          if (Math.max(img.width, img.height) > maxDim) {
            if (img.width >= img.height) {
              targetWidth = maxDim;
              targetHeight = Math.round((img.height * maxDim) / img.width);
            } else {
              targetHeight = maxDim;
              targetWidth = Math.round((img.width * maxDim) / img.height);
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setUncroppedImage(dataUrl);
          onUpload(dataUrl);
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCrop = (croppedDataUrl) => {
    setIsCropping(false);
    onCapture(croppedDataUrl);
  };

  const handleResetCrop = () => {
    if (uncroppedImage) {
      onCapture(uncroppedImage);
    }
  };

  return (
    <Card className="loob-card h-100">
      <div className="loob-card-header">
        <div className="d-flex align-items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          {isCropping ? "CROP LUBRICANT REGION" : capturedImage ? "UPLOADED IMAGE PREVIEW" : "LIVE CAMERA PREVIEW"}
        </div>
        <span className="badge bg-dark text-muted border border-secondary font-monospace" style={{ fontSize: '0.72rem' }}>
          {isCropping ? "CROPPING" : capturedImage ? "IMAGE CAPTURED" : cameraActive ? "LIVE FEED" : "STANDBY"}
        </span>
      </div>

      <Card.Body className="p-3 d-flex flex-column justify-content-between">
        {!capturedImage ? (
          <div className="camera-container mb-3">
            <video ref={videoRef} className="camera-video" playsInline muted></video>
            <canvas ref={canvasRef} className="d-none"></canvas>

            {/* Square ROI Overlay Guide */}
            {cameraActive && (
              <div className="roi-overlay">
                <div className="roi-corner roi-top-left"></div>
                <div className="roi-corner roi-top-right"></div>
                <div className="roi-corner roi-bottom-left"></div>
                <div className="roi-corner roi-bottom-right"></div>
                <div className="roi-label">SQUARE ROI</div>
              </div>
            )}

            {!cameraActive && (
              <div className="camera-standby-view">
                <div 
                  className="camera-standby-lens"
                  onClick={handleRequestCamera}
                  title="Click to Enable Camera"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00b8d9" strokeWidth="1.8">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                
                <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-2"
                     style={{
                       background: cameraStatusType === 'denied' ? 'rgba(245, 166, 35, 0.12)' : 'rgba(0, 184, 217, 0.12)',
                       border: `1px solid ${cameraStatusType === 'denied' ? 'rgba(245, 166, 35, 0.35)' : 'rgba(0, 184, 217, 0.35)'}`,
                       fontSize: '0.75rem',
                       fontWeight: '600',
                       color: cameraStatusType === 'denied' ? '#f5a623' : '#00b8d9'
                     }}>
                  <span className="pulse-dot" style={{
                    background: cameraStatusType === 'denied' ? '#f5a623' : '#00b8d9',
                    boxShadow: `0 0 8px ${cameraStatusType === 'denied' ? '#f5a623' : '#00b8d9'}`
                  }}></span>
                  {cameraStatusType === 'denied' ? 'PERMISSION BLOCKED' : 'CAMERA STANDBY'}
                </div>

                <h6 className="fw-bold text-light mb-1">
                  {cameraStatusType === 'denied' ? 'Camera Access Required' : 'Live Camera Inactive'}
                </h6>
                <p className="small text-muted mb-3" style={{ maxWidth: '320px', margin: '0 auto 1rem auto' }}>
                  {cameraError || "Enable device camera for real-time Square ROI inspection or upload an image file."}
                </p>

                <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    className="btn-loob-primary px-3 py-2 d-inline-flex align-items-center gap-2"
                    onClick={handleRequestCamera}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span>Enable Camera</span>
                  </Button>

                  <Button 
                    size="sm" 
                    className="btn-loob-secondary px-3 py-2"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  >
                    <span>📁 Upload Image</span>
                  </Button>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    className="btn btn-link text-muted small p-0 text-decoration-none"
                    style={{ fontSize: '0.76rem' }}
                    onClick={() => setShowCameraModal(true)}
                  >
                    ℹ How to enable camera permissions
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isCropping ? (
          <ImageCropper 
            imageSrc={uncroppedImage || capturedImage}
            onApply={handleApplyCrop}
            onCancel={() => setIsCropping(false)}
            onReset={handleResetCrop}
          />
        ) : (
          <div className="preview-container mb-3">
            <img src={capturedImage} alt="Lubricant Sample" className="preview-img" />
          </div>
        )}

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="d-none" 
        />

        {/* Action Controls */}
        {!isCropping && (
          <Stack direction="horizontal" gap={2} className="justify-content-center">
            {!capturedImage ? (
              <>
                <Button 
                  className="btn-loob-primary flex-fill" 
                  onClick={handleCaptureClick}
                  disabled={!cameraActive || isAnalyzing}
                >
                  <span className="me-2">◉</span> CAPTURE
                </Button>
                <Button 
                  className="btn-loob-secondary flex-fill" 
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={isAnalyzing}
                >
                  <span className="me-2">↑</span> Upload Image
                </Button>
              </>
            ) : (
              <>
                <Button 
                  className="btn-loob-secondary py-2 px-3" 
                  onClick={() => setIsCropping(true)}
                  disabled={isAnalyzing}
                  title="Select and crop lubricant region"
                >
                  <span className="me-1">✂</span> Crop Image
                </Button>
                <Button 
                  className="btn-loob-secondary py-2 px-3" 
                  onClick={onRetake}
                  disabled={isAnalyzing}
                >
                  <span className="me-1">↻</span> RETAKE
                </Button>
                <Button 
                  className="btn-loob-primary flex-fill py-2" 
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      ANALYZING...
                    </>
                  ) : (
                    <>
                      <span className="me-2">⚡</span> ANALYZE IMAGE
                    </>
                  )}
                </Button>
              </>
            )}
          </Stack>
        )}

        {/* POPUP MODAL FOR CAMERA ACCESS & PERMISSIONS */}
        <CameraAccessModal
          show={showCameraModal}
          onHide={() => setShowCameraModal(false)}
          statusType={cameraStatusType}
          cameraError={cameraError}
          onRetry={handleRequestCamera}
          onUploadClick={() => {
            setShowCameraModal(false);
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
        />
      </Card.Body>
    </Card>
  );
}

// ============================================================
// RESULT ANALYSIS & TECHNICAL DETAILS PANEL
// ============================================================
function ResultPanel({ result, isAnalyzing, error, onNewAnalysis, onRetry, onOpenReport }) {
  const [reasoningTheme, setReasoningTheme] = useState('gold');

  if (isAnalyzing) {
    return (
      <Card className="loob-card h-100">
        <div className="loob-card-header">RESULT ANALYSIS</div>
        <Card.Body className="loading-box d-flex flex-column align-items-center justify-content-center">
          <Spinner animation="border" variant="info" style={{ width: '3.5rem', height: '3.5rem' }} className="mb-4" />
          <h5 className="fw-bold text-light mb-2">ANALYZING SAMPLE</h5>
          <p className="text-muted small">Please wait while the AI analysis pipeline evaluates the lubricant sample...</p>
          
          <div className="loading-steps">
            <div className="loading-step-item loading-step-active">
              <span className="pulse-dot"></span> Verifying lubricant sample
            </div>
            <div className="loading-step-item loading-step-active">
              <span className="pulse-dot"></span> Running AI visual analysis (EfficientNet-B3, Color, Texture)
            </div>
            <div className="loading-step-item loading-step-active">
              <span className="pulse-dot"></span> Combining weighted model evidence
            </div>
            <div className="loading-step-item loading-step-active">
              <span className="pulse-dot"></span> Generating final assessment
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="loob-card h-100">
        <div className="loob-card-header">RESULT ANALYSIS</div>
        <Card.Body className="p-4 text-center d-flex flex-column align-items-center justify-content-center">
          <Alert variant="danger" className="bg-transparent border-danger text-danger w-100 p-4 mb-4">
            <h5 className="fw-bold mb-2">ANALYSIS FAILED</h5>
            <p className="small mb-0">Unable to complete the lubricant analysis. Please try again.</p>
          </Alert>
          <Button className="btn-loob-primary px-4" onClick={onRetry}>
            ↻ RETRY
          </Button>
        </Card.Body>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="loob-card h-100">
        <div className="loob-card-header">RESULT ANALYSIS</div>
        <Card.Body className="p-4 text-center d-flex flex-column align-items-center justify-content-center text-muted" style={{ minHeight: '350px' }}>
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#2c3e66" strokeWidth="1.5" className="mb-3">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <h6 className="fw-semibold text-light mb-1">Awaiting Lubricant Sample</h6>
          <p className="small text-muted max-w-sm mb-0">
            Capture or upload a sample image on the left, then click <strong>ANALYZE IMAGE</strong> to execute condition analysis.
          </p>
        </Card.Body>
      </Card>
    );
  }

  // Handle Non-Lubricant Rejection Gate
  if (result.is_lubricant === false || result.final_class === "non-lubricant") {
    return (
      <Card className="loob-card h-100">
        <div className="loob-card-header text-warning">RESULT ANALYSIS</div>
        <Card.Body className="p-4">
          <div className="text-center p-4 border border-warning rounded-3 mb-4" style={{ background: 'rgba(245, 166, 35, 0.08)' }}>
            <Badge bg="warning" text="dark" className="px-3 py-2 fs-6 fw-bold mb-3">
              SAMPLE NOT IDENTIFIED
            </Badge>
            <h4 className="fw-bold text-light mb-2">NON-LUBRICANT IMAGE</h4>
            <p className="text-muted small mb-0">
              The submitted image was not identified as a suitable lubricant sample by the Vision Verification Gate.
            </p>
          </div>

          <div className="recommendation-card">
            <div className="recommendation-title">RECOMMENDATION</div>
            <p className="recommendation-text">
              Please capture a clear, well-lit image containing the lubricant sample inside the square ROI guide and try again.
            </p>
          </div>

          {result.gate_reasoning && (
            <Accordion className="loob-accordion mb-4">
              <Accordion.Item eventKey="0">
                <Accordion.Header>GATE REASONING</Accordion.Header>
                <Accordion.Body>
                  <div className="gate-reasoning-content">
                    {result.gate_reasoning}
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          )}

          <Button className="btn-loob-primary w-100" onClick={onNewAnalysis}>
            ↻ TRY AGAIN
          </Button>
        </Card.Body>
      </Card>
    );
  }

  // Calculate / Parse Result Parameters
  let finalClass = (result.final_class || "").toLowerCase();
  let statusText = result.status || "";
  let confidenceVal = typeof result.confidence === "number" ? result.confidence : 0;

  // Fallback calculation if final_class was not set directly by LLM
  if (!finalClass || !["c1", "c2", "c3"].includes(finalClass)) {
    const ev = result.model_evidence || {};
    const effPred = (result.efficientnet_evidence?.prediction || ev.efficientnet?.prediction || "").toLowerCase();
    const colPred = (result.color_evidence?.prediction || ev.color?.prediction || "").toLowerCase();
    const texPred = (result.texture_evidence?.prediction || ev.texture?.prediction || "").toLowerCase();

    const counts = { c1: 0, c2: 0, c3: 0 };
    if (effPred in counts) counts[effPred] += 0.55;
    if (colPred in counts) counts[colPred] += 0.15;
    if (texPred in counts) counts[texPred] += 0.30;

    finalClass = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    const statusMap = { c1: "Fresh", c2: "Semi-degraded", c3: "Fully-degraded" };
    statusText = statusMap[finalClass] || "Analyzed";
    confidenceVal = counts[finalClass] || 0.85;
  }

  // Apply Classification Safety Rule
  if ((finalClass === "c1" || finalClass === "c2") && confidenceVal < 0.55) {
    finalClass = "c3";
    statusText = "Fully-degraded";
  }

  const confidencePercentage = (confidenceVal * 100).toFixed(1) + "%";

  // Class Visual Styling Definitions
  const classConfigs = {
    c1: {
      cardClass: "condition-c1",
      badgeClass: "grade-badge-c1",
      grade: "C1",
      title: "INITIAL STAGE OF DEGRADATION",
      subtitle: "(HEALTHY)",
      recommendation: "The lubricant sample displays characteristics of fresh, healthy oil. Lubricant condition is optimal for continued operational use."
    },
    c2: {
      cardClass: "condition-c2",
      badgeClass: "grade-badge-c2",
      grade: "C2",
      title: "TRANSITIONAL DEGRADATION",
      subtitle: "(USABLE BUT GOING TO DEGRADE SOON)",
      recommendation: "The lubricant displays moderate degradation markers. Monitoring frequency should be increased, and schedule preventive maintenance replacement in the near term."
    },
    c3: {
      cardClass: "condition-c3",
      badgeClass: "grade-badge-c3",
      grade: "C3",
      title: "ADVANCED DEGRADATION",
      subtitle: "(AVOID USAGE)",
      recommendation: "The lubricant shows visual characteristics associated with advanced degradation. Avoid usage and consider immediate lubricant replacement."
    }
  };

  const currentConfig = classConfigs[finalClass] || classConfigs.c3;

  return (
    <Card className="loob-card h-100">
      <div className="loob-card-header">
        <span>RESULT ANALYSIS</span>
        <Button size="sm" className="btn-loob-secondary py-1 px-3" onClick={onNewAnalysis}>
          ↻ NEW ANALYSIS
        </Button>
      </div>

      <Card.Body className="p-4">
        {/* Large Condition Result Card */}
        <div className={`condition-card ${currentConfig.cardClass}`}>
          <div className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
            ANALYSIS RESULT
          </div>
          <div className={currentConfig.badgeClass}>
            {currentConfig.grade} GRADE DETECTED
          </div>
          <div className="condition-title">{currentConfig.title}</div>
          <div className="condition-subtitle">{currentConfig.subtitle}</div>
        </div>

        {/* Confidence Box */}
        <div className="confidence-box">
          <span className="confidence-label">System Confidence</span>
          <span className="confidence-value">{confidencePercentage}</span>
        </div>

        {/* Recommendation Card */}
        <div className="recommendation-card">
          <div className="recommendation-title">RECOMMENDATION</div>
          <p className="recommendation-text">{currentConfig.recommendation}</p>
        </div>

        {/* PROMINENT ACTION: VIEW FULL ANALYSIS REPORT */}
        <Button 
          className="btn-loob-primary w-100 py-2 fs-6 fw-bold mb-3 d-flex align-items-center justify-content-center gap-2"
          onClick={onOpenReport}
          style={{
            letterSpacing: '0.5px',
            background: 'linear-gradient(135deg, #00b8d9 0%, #0066cc 100%)',
            boxShadow: '0 0 15px rgba(0, 184, 217, 0.4)',
            border: 'none'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          VIEW FULL ANALYSIS REPORT (PDF / PREVIEW)
        </Button>

        {/* Accordions for Technical Evidence & Reports */}
        <Accordion defaultActiveKey="0" className="loob-accordion mb-3">
          
          {/* MODEL EVIDENCE ACCORDION */}
          <Accordion.Item eventKey="0">
            <Accordion.Header>▼ MODEL EVIDENCE</Accordion.Header>
            <Accordion.Body>
              <p className="small mb-3 text-secondary-light">
                Evidence extracted from the individual parallel machine-learning classifiers:
              </p>

              <Table responsive className="loob-table align-middle">
                <thead>
                  <tr>
                    <th>Model Component</th>
                    <th>Prediction</th>
                    <th>C1 %</th>
                    <th>C2 %</th>
                    <th>C3 %</th>
                  </tr>
                </thead>
                <tbody>
                  {renderModelEvidenceRow("EfficientNet-B3", result.efficientnet_evidence || result.model_evidence?.efficientnet)}
                  {renderModelEvidenceRow("Color Analysis", result.color_evidence || result.model_evidence?.color)}
                  {renderModelEvidenceRow("Texture Analysis", result.texture_evidence || result.model_evidence?.texture)}
                </tbody>
              </Table>

              {/* MODEL WEIGHTS (FIXED DISPLAY) */}
              <div className="weights-container">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold text-light small">FIXED MODEL WEIGHTS</span>
                  <Badge bg="dark" className="text-light border border-secondary font-monospace">READ-ONLY</Badge>
                </div>
                <div className="weight-row">
                  <span className="text-light">EfficientNet-B3</span>
                  <span className="fw-bold text-cyan-light">55%</span>
                </div>
                <div className="weight-row">
                  <span className="text-light">Color Analysis</span>
                  <span className="fw-bold text-cyan-light">15%</span>
                </div>
                <div className="weight-row">
                  <span className="text-light">Texture Analysis</span>
                  <span className="fw-bold text-cyan-light">30%</span>
                </div>
              </div>

              {/* MODEL AGREEMENT */}
              <div className="mt-3 d-flex align-items-center justify-content-between p-2 rounded" style={{ background: 'var(--loob-bg-secondary)' }}>
                <span className="small text-light fw-semibold">MODEL AGREEMENT</span>
                {renderAgreementBadge(result)}
              </div>
            </Accordion.Body>
          </Accordion.Item>

          {/* AI ANALYSIS REPORT ACCORDION */}
          {result.analysis_report && (
            <Accordion.Item eventKey="1">
              <Accordion.Header>▼ AI ANALYSIS REPORT</Accordion.Header>
              <Accordion.Body>
                <div className="analysis-report-content font-monospace small">
                  {result.analysis_report}
                </div>
              </Accordion.Body>
            </Accordion.Item>
          )}

          {/* DECISION REASONING ACCORDION */}
          {result.reasoning && (
            <Accordion.Item eventKey="2">
              <Accordion.Header>▼ DECISION REASONING</Accordion.Header>
              <Accordion.Body>
                <div className="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-secondary border-opacity-25">
                  <span className="small fw-bold text-uppercase" style={{ color: '#94a3b8', letterSpacing: '0.8px', fontSize: '0.72rem' }}>
                    AI Decision Narrative
                  </span>
                  <div className="d-flex align-items-center gap-1">
                    <span className="small me-1 text-muted" style={{ fontSize: '0.72rem' }}>Text Color:</span>
                    <button
                      type="button"
                      className={`btn btn-sm py-0 px-2 rounded-pill ${reasoningTheme === 'gold' ? 'btn-warning text-dark fw-bold' : 'btn-outline-secondary text-light'}`}
                      style={{ fontSize: '0.72rem' }}
                      onClick={(e) => { e.stopPropagation(); setReasoningTheme('gold'); }}
                      title="Amber Gold"
                    >
                      ● Amber Gold
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm py-0 px-2 rounded-pill ${reasoningTheme === 'cyan' ? 'btn-info text-dark fw-bold' : 'btn-outline-secondary text-light'}`}
                      style={{ fontSize: '0.72rem' }}
                      onClick={(e) => { e.stopPropagation(); setReasoningTheme('cyan'); }}
                      title="Sky Cyan"
                    >
                      ● Sky Cyan
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm py-0 px-2 rounded-pill ${reasoningTheme === 'mint' ? 'btn-success text-dark fw-bold' : 'btn-outline-secondary text-light'}`}
                      style={{ fontSize: '0.72rem' }}
                      onClick={(e) => { e.stopPropagation(); setReasoningTheme('mint'); }}
                      title="Mint Green"
                    >
                      ● Mint Green
                    </button>
                  </div>
                </div>
                <div 
                  className={`decision-reasoning-content decision-reasoning-${reasoningTheme}`}
                  style={{
                    color: reasoningTheme === 'cyan' ? '#38bdf8' : reasoningTheme === 'mint' ? '#4ade80' : '#fde047',
                    borderLeftColor: reasoningTheme === 'cyan' ? '#38bdf8' : reasoningTheme === 'mint' ? '#4ade80' : '#fde047',
                    fontWeight: 500
                  }}
                >
                  {result.reasoning}
                </div>
              </Accordion.Body>
            </Accordion.Item>
          )}

        </Accordion>
      </Card.Body>
    </Card>
  );
}

// Helper to render individual model evidence row
function renderModelEvidenceRow(name, data) {
  if (!data) {
    return (
      <tr>
        <td className="fw-semibold text-light">{name}</td>
        <td className="text-secondary-light">N/A</td>
        <td className="text-secondary-light">-</td>
        <td className="text-secondary-light">-</td>
        <td className="text-secondary-light">-</td>
      </tr>
    );
  }

  const pred = (data.prediction || "-").toUpperCase();
  const probs = data.probabilities || {};
  const formatProb = (v) => typeof v === "number" ? (v * 100).toFixed(1) + "%" : "0.0%";

  return (
    <tr>
      <td className="fw-semibold text-light">{name}</td>
      <td>
        <Badge bg={pred === "C1" ? "success" : pred === "C2" ? "warning" : "danger"} className="px-2 py-1">
          {pred}
        </Badge>
      </td>
      <td className="text-light fw-semibold">{formatProb(probs.c1)}</td>
      <td className="text-light fw-semibold">{formatProb(probs.c2)}</td>
      <td className="text-light fw-semibold">{formatProb(probs.c3)}</td>
    </tr>
  );
}

// Helper to render agreement badge
function renderAgreementBadge(result) {
  const agreement = result.model_evidence?.agreement;
  if (agreement && agreement.models_supporting === agreement.total_models) {
    return <Badge bg="success" className="px-2 py-1">✓ All models agree</Badge>;
  } else if (agreement) {
    return <Badge bg="warning" text="dark" className="px-2 py-1">⚠ Models show disagreement</Badge>;
  }
  return <Badge bg="success" className="px-2 py-1">✓ Models in agreement</Badge>;
}

// ============================================================
// ANALYSIS REPORT MODAL COMPONENT (PREVIEW & DOWNLOAD)
// ============================================================
function AnalysisReportModal({ show, onHide, result, capturedImage }) {
  const [viewMode, setViewMode] = useState('interactive'); // 'interactive' or 'pdf'
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  if (!result) return null;

  // Extract structured report or assemble fallback
  const report = result.report || {
    metadata: {
      report_id: result.report_id || `LOOV-RPT-${Date.now().toString(36).toUpperCase()}`,
      timestamp_formatted: new Date().toUTCString(),
      system_version: "LOOV VISION AI v2.4 (Industrial Edition)"
    },
    executive_summary: {
      final_class: (result.final_class || "c3").toLowerCase(),
      condition_label: result.status || "Analyzed",
      confidence_pct: typeof result.confidence === "number" ? `${(result.confidence * 100).toFixed(1)}%` : "85.0%",
      summary_headline: "LUBRICANT CONDITION REPORT",
      summary_text: result.reasoning || "Multi-modal analysis completed.",
      operational_urgency: "Operational Advisory"
    },
    models: {
      efficientnet: {
        model_name: "EfficientNet-B3 (Optimized ONNX)",
        weight: 0.55,
        predicted_class: (result.efficientnet_evidence?.prediction || "c3").toLowerCase(),
        condition_label: result.efficientnet_evidence?.status || "Analyzed",
        probabilities: result.efficientnet_evidence?.probabilities || { c1: 0, c2: 0, c3: 0 },
        interpretation: "EfficientNet-B3 deep convolutional feature extraction."
      },
      color: {
        model_name: "Two-Stage Color Analysis Pipeline",
        weight: 0.15,
        predicted_class: (result.color_evidence?.prediction || "c3").toLowerCase(),
        condition_label: result.color_evidence?.status || "Analyzed",
        probabilities: result.color_evidence?.probabilities || { c1: 0, c2: 0, c3: 0 },
        features: result.color_evidence?.features || null,
        interpretation: "Colorimetric feature evaluation."
      },
      texture: {
        model_name: "Texture Random Forest v4",
        weight: 0.30,
        predicted_class: (result.texture_evidence?.prediction || "c3").toLowerCase(),
        condition_label: result.texture_evidence?.status || "Analyzed",
        probabilities: result.texture_evidence?.probabilities || { c1: 0, c2: 0, c3: 0 },
        features: result.texture_evidence?.features || null,
        interpretation: "Surface spatial texture analysis."
      }
    },
    agreement: {
      consensus_status: "Evaluated",
      agreement_analysis: "Multi-modal consensus analysis.",
      models_supporting: 3,
      total_models: 3
    },
    reasoning: {
      decision_narrative: result.reasoning || result.analysis_report || "Evidence synthesized.",
      supporting_factors: ["Multi-model agreement", "Visual feature corroboration"],
      uncertainties_or_caveats: ["Optical screening does not replace laboratory testing."]
    },
    recommendations: {
      primary_action: "Follow standard maintenance protocol.",
      operational_guidance: ["Monitor lubricant condition at regular intervals."],
      laboratory_advisory: "Corroborate with ASTM laboratory tests when high criticality exists."
    },
    disclaimer: "Notice: LOOV VISION AI provides automated optical screening and does not replace ASTM laboratory tests."
  };

  const reportId = report.metadata?.report_id || result.report_id || "document";
  const exec = report.executive_summary || {};
  const finalClass = (exec.final_class || "c3").toLowerCase();
  const models = report.models || {};
  const agreement = report.agreement || {};
  const reasoning = report.reasoning || {};
  const recs = report.recommendations || {};
  const meta = report.metadata || {};

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch('/api/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: report, id: reportId })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `LoovVision_Analysis_Report_${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Direct download failed, falling back to GET:", err);
      try {
        window.open(`/api/report/pdf?id=${encodeURIComponent(reportId)}`, '_blank');
      } catch (e2) {
        setDownloadError("Failed to download PDF. Please try again.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderProbBar = (label, value, variant) => {
    const pct = typeof value === "number" ? (value * 100).toFixed(1) : "0.0";
    return (
      <div key={label} className="mb-2">
        <div className="prob-meter-label">
          <span className="text-secondary-light">{label}</span>
          <span className="fw-bold text-light">{pct}%</span>
        </div>
        <div className="prob-meter-track">
          <div
            className="prob-meter-bar"
            style={{
              width: `${Math.min(100, Math.max(0, parseFloat(pct)))}%`,
              backgroundColor: variant === "c1" ? "var(--loob-c1-green)" : variant === "c2" ? "var(--loob-c2-amber)" : "var(--loob-c3-red)"
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      scrollable
      centered
      className="loob-report-modal"
    >
      <Modal.Header closeButton>
        <div className="d-flex align-items-center justify-content-between w-100 me-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #00b8d9 0%, #0066cc 100%)',
                color: '#fff'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              </svg>
            </div>
            <div>
              <div className="fw-bold text-light fs-5" style={{ letterSpacing: '0.5px' }}>
                LOOV VISION AI — LUBRICANT ANALYSIS REPORT
              </div>
              <div className="small text-muted font-monospace">
                REPORT ID: <span className="text-cyan-light">{reportId}</span> • GENERATED: {meta.timestamp_formatted || meta.timestamp_iso}
              </div>
            </div>
          </div>

          <div className="report-action-toolbar ms-auto">
            <div className="btn-group btn-group-sm me-2" role="group">
              <button
                type="button"
                className={`btn ${viewMode === 'interactive' ? 'btn-info text-dark fw-bold' : 'btn-outline-secondary text-light'}`}
                onClick={() => setViewMode('interactive')}
              >
                👁 Interactive View
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'pdf' ? 'btn-info text-dark fw-bold' : 'btn-outline-secondary text-light'}`}
                onClick={() => setViewMode('pdf')}
              >
                📄 PDF Preview
              </button>
            </div>

            <Button
              size="sm"
              className="btn-loob-primary d-inline-flex align-items-center gap-2"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Spinner size="sm" animation="border" />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download PDF
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline-light"
              className="d-inline-flex align-items-center gap-1"
              onClick={handlePrint}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={onHide}
            >
              ✕ Back to Results
            </Button>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-3 p-md-4">
        {downloadError && (
          <Alert variant="danger" dismissible onClose={() => setDownloadError(null)} className="py-2">
            {downloadError}
          </Alert>
        )}

        {viewMode === 'pdf' ? (
          <div className="pdf-preview-container d-flex flex-column">
            <div className="p-2 bg-dark d-flex justify-content-between align-items-center border-bottom border-secondary">
              <span className="small text-light">
                Live PDF Document Preview (Generated on the fly via ReportLab)
              </span>
              <Button size="sm" variant="outline-info" onClick={handleDownloadPdf}>
                Download Local Copy
              </Button>
            </div>
            <iframe
              src={`/api/report/pdf?id=${encodeURIComponent(reportId)}&preview=1`}
              className="pdf-preview-iframe"
              title="Loov Vision AI PDF Report"
            />
          </div>
        ) : (
          <div>
            <div className="report-meta-grid">
              <div className="report-meta-item">
                <div className="meta-label">Report ID</div>
                <div className="meta-value font-monospace text-cyan-light">{reportId}</div>
              </div>
              <div className="report-meta-item">
                <div className="meta-label">Inspection Date</div>
                <div className="meta-value">{meta.timestamp_formatted || meta.timestamp_iso}</div>
              </div>
              <div className="report-meta-item">
                <div className="meta-label">Inspection Standard</div>
                <div className="meta-value">{meta.inspection_type || "Multi-Modal Optical"}</div>
              </div>
              <div className="report-meta-item">
                <div className="meta-label">Operational Urgency</div>
                <div className="meta-value" style={{ color: finalClass === 'c1' ? 'var(--loob-c1-green)' : finalClass === 'c2' ? 'var(--loob-c2-amber)' : 'var(--loob-c3-red)' }}>
                  {exec.operational_urgency || "Advisory"}
                </div>
              </div>
              <div className="report-meta-item">
                <div className="meta-label">Overall Confidence</div>
                <div className="meta-value text-cyan-light">{exec.confidence_pct || "85.0%"}</div>
              </div>
            </div>

            <div className={`report-assessment-card report-assessment-${finalClass}`}>
              <Row className="align-items-center g-4">
                <Col md={capturedImage ? 8 : 12}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Badge bg={finalClass === "c1" ? "success" : finalClass === "c2" ? "warning" : "danger"} className="px-3 py-2 fs-6 fw-bold">
                      {finalClass.toUpperCase()} — {exec.condition_label?.toUpperCase()}
                    </Badge>
                    <span className="small text-light fw-semibold">
                      System Confidence: {exec.confidence_pct}
                    </span>
                  </div>
                  <h4 className="fw-bold text-light mb-2">
                    {exec.summary_headline || "Lubricant Condition Assessment"}
                  </h4>
                  <p className="text-secondary-light mb-0 small leading-relaxed">
                    {exec.summary_text}
                  </p>
                </Col>

                {capturedImage && (
                  <Col md={4} className="text-center">
                    <div className="p-2 rounded bg-dark border border-secondary border-opacity-50 d-inline-block">
                      <img
                        src={capturedImage}
                        alt="Analysed Lubricant Sample"
                        style={{ maxWidth: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <div className="small text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                        Analysed Sample ROI
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
            </div>

            <div className="mb-4">
              <div className="report-section-title">
                <span>1. MULTI-MODEL INFERENCE & EVIDENCE BREAKDOWN</span>
              </div>

              <Row className="g-3">
                <Col md={4}>
                  <div className="report-model-card">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold text-light small">{models.efficientnet?.model_name || "EfficientNet-B3"}</span>
                      <Badge bg="info" text="dark" className="fw-bold">Weight: 55%</Badge>
                    </div>

                    <div className="mb-3 d-flex align-items-center justify-content-between p-2 rounded" style={{ background: 'var(--loob-bg-secondary)' }}>
                      <span className="small text-muted">Predicted Class:</span>
                      <Badge bg={models.efficientnet?.predicted_class === "c1" ? "success" : models.efficientnet?.predicted_class === "c2" ? "warning" : "danger"} className="px-2 py-1">
                        {models.efficientnet?.predicted_class?.toUpperCase()} ({models.efficientnet?.condition_label})
                      </Badge>
                    </div>

                    <div className="small fw-semibold text-light mb-1">Probability Distribution:</div>
                    {renderProbBar("C1 (Fresh)", models.efficientnet?.probabilities?.c1, "c1")}
                    {renderProbBar("C2 (Semi-degraded)", models.efficientnet?.probabilities?.c2, "c2")}
                    {renderProbBar("C3 (Fully-degraded)", models.efficientnet?.probabilities?.c3, "c3")}

                    <p className="small text-muted mt-3 mb-0" style={{ fontSize: '0.76rem', lineHeight: '1.4' }}>
                      {models.efficientnet?.interpretation}
                    </p>
                  </div>
                </Col>

                <Col md={4}>
                  <div className="report-model-card">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold text-light small">{models.color?.model_name || "Color Pipeline"}</span>
                      <Badge bg="warning" text="dark" className="fw-bold">Weight: 15%</Badge>
                    </div>

                    <div className="mb-3 d-flex align-items-center justify-content-between p-2 rounded" style={{ background: 'var(--loob-bg-secondary)' }}>
                      <span className="small text-muted">Predicted Class:</span>
                      <Badge bg={models.color?.predicted_class === "c1" ? "success" : models.color?.predicted_class === "c2" ? "warning" : "danger"} className="px-2 py-1">
                        {models.color?.predicted_class?.toUpperCase()} ({models.color?.condition_label})
                      </Badge>
                    </div>

                    <div className="small fw-semibold text-light mb-1">Probability Distribution:</div>
                    {renderProbBar("C1 (Fresh)", models.color?.probabilities?.c1, "c1")}
                    {renderProbBar("C2 (Semi-degraded)", models.color?.probabilities?.c2, "c2")}
                    {renderProbBar("C3 (Fully-degraded)", models.color?.probabilities?.c3, "c3")}

                    {models.color?.features && (
                      <div className="feature-pill-grid">
                        <div className="feature-pill-item">
                          <span className="feature-pill-key">L* Median</span>
                          <span className="feature-pill-val">{models.color.features.L_median}</span>
                        </div>
                        <div className="feature-pill-item">
                          <span className="feature-pill-key">V Median</span>
                          <span className="feature-pill-val">{models.color.features.V_median}</span>
                        </div>
                        <div className="feature-pill-item">
                          <span className="feature-pill-key">Norm Green</span>
                          <span className="feature-pill-val">{models.color.features.NG_median}</span>
                        </div>
                        <div className="feature-pill-item">
                          <span className="feature-pill-key">LAB B*</span>
                          <span className="feature-pill-val">{models.color.features.LAB_B_median}</span>
                        </div>
                      </div>
                    )}

                    <p className="small text-muted mt-3 mb-0" style={{ fontSize: '0.76rem', lineHeight: '1.4' }}>
                      {models.color?.interpretation}
                    </p>
                  </div>
                </Col>

                <Col md={4}>
                  <div className="report-model-card">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold text-light small">{models.texture?.model_name || "Texture Random Forest"}</span>
                      <Badge bg="primary" className="fw-bold">Weight: 30%</Badge>
                    </div>

                    <div className="mb-3 d-flex align-items-center justify-content-between p-2 rounded" style={{ background: 'var(--loob-bg-secondary)' }}>
                      <span className="small text-muted">Predicted Class:</span>
                      <Badge bg={models.texture?.predicted_class === "c1" ? "success" : models.texture?.predicted_class === "c2" ? "warning" : "danger"} className="px-2 py-1">
                        {models.texture?.predicted_class?.toUpperCase()} ({models.texture?.condition_label})
                      </Badge>
                    </div>

                    <div className="small fw-semibold text-light mb-1">Probability Distribution:</div>
                    {renderProbBar("C1 (Fresh)", models.texture?.probabilities?.c1, "c1")}
                    {renderProbBar("C2 (Semi-degraded)", models.texture?.probabilities?.c2, "c2")}
                    {renderProbBar("C3 (Fully-degraded)", models.texture?.probabilities?.c3, "c3")}

                    {models.texture?.features && (
                      <div className="feature-pill-grid">
                        <div className="feature-pill-item">
                          <span className="feature-pill-key">Contrast</span>
                          <span className="feature-pill-val">{models.texture.features.contrast}</span>
                        </div>
                        <div className="feature-pill-item">
                          <span className="feature-pill-key">Homogeneity</span>
                          <span className="feature-pill-val">{models.texture.features.homogeneity}</span>
                        </div>
                        <div className="feature-pill-item">
                          <span className="feature-pill-key">Energy</span>
                          <span className="feature-pill-val">{models.texture.features.energy}</span>
                        </div>
                        <div className="feature-pill-item">
                          <span className="feature-pill-key">Correlation</span>
                          <span className="feature-pill-val">{models.texture.features.correlation}</span>
                        </div>
                      </div>
                    )}

                    <p className="small text-muted mt-3 mb-0" style={{ fontSize: '0.76rem', lineHeight: '1.4' }}>
                      {models.texture?.interpretation}
                    </p>
                  </div>
                </Col>
              </Row>
            </div>

            <div className="report-consensus-banner">
              <div
                className="d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: agreement.is_unanimous ? 'rgba(0, 201, 141, 0.2)' : 'rgba(245, 166, 35, 0.2)',
                  color: agreement.is_unanimous ? 'var(--loob-c1-green)' : 'var(--loob-c2-amber)'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
              </div>
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="fw-bold text-light">MODEL AGREEMENT & CONSENSUS:</span>
                  <Badge bg={agreement.is_unanimous ? "success" : "warning"} text={agreement.is_unanimous ? "light" : "dark"}>
                    {agreement.consensus_status || "Analyzed"}
                  </Badge>
                </div>
                <div className="small text-secondary-light">
                  {agreement.agreement_analysis}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="report-section-title">
                <span>2. AI DECISION REASONING & EVIDENCE SYNTHESIS</span>
              </div>
              <Card className="loob-card mb-3">
                <Card.Body className="p-3">
                  <p className="text-light small mb-3 leading-relaxed">
                    {reasoning.decision_narrative}
                  </p>

                  <Row className="g-3">
                    <Col md={6}>
                      <div className="p-2 rounded" style={{ background: 'var(--loob-bg)' }}>
                        <div className="fw-bold text-cyan-light small mb-2">Supporting Visual Factors:</div>
                        <ul className="small text-secondary-light mb-0 ps-3">
                          {reasoning.supporting_factors?.map((f, idx) => (
                            <li key={idx} className="mb-1">{f}</li>
                          ))}
                        </ul>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="p-2 rounded" style={{ background: 'var(--loob-bg)' }}>
                        <div className="fw-bold text-warning small mb-2">Technical Constraints & Caveats:</div>
                        <ul className="small text-secondary-light mb-0 ps-3">
                          {reasoning.uncertainties_or_caveats?.map((u, idx) => (
                            <li key={idx} className="mb-1">{u}</li>
                          ))}
                        </ul>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </div>

            <div className="report-rec-card mb-4">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-bold text-light fs-6">3. LUBRICANT MAINTENANCE & OPERATIONAL DIRECTIVES</span>
              </div>
              <div className="fw-bold text-cyan-light mb-2">
                Directive: {recs.primary_action}
              </div>
              <ul className="small text-light mb-3 ps-3">
                {recs.operational_guidance?.map((g, idx) => (
                  <li key={idx} className="mb-1">{g}</li>
                ))}
              </ul>
              {recs.laboratory_advisory && (
                <div className="small text-secondary-light border-top border-secondary border-opacity-25 pt-2">
                  <strong>Laboratory Advisory:</strong> {recs.laboratory_advisory}
                </div>
              )}
            </div>

            <div className="report-disclaimer-box">
              <strong>OFFICIAL INDUSTRIAL NOTICE:</strong> {report.disclaimer}
            </div>

            <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center text-muted small">
              <span>{meta.system_version || "LOOV VISION AI"} • Document ID: {reportId}</span>
              <span>Screen View • Use 'Download PDF' for formal inspection documentation</span>
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================
function App() {
  const [selectedModel, setSelectedModel] = useState("Original Image Model");
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleCapture = (imageData) => {
    setCapturedImage(imageData);
    setResultData(null);
    setErrorState(null);
    setShowReportModal(false);
  };

  const handleUpload = (imageData) => {
    setCapturedImage(imageData);
    setResultData(null);
    setErrorState(null);
    setShowReportModal(false);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setResultData(null);
    setErrorState(null);
    setShowReportModal(false);
  };

  const handleNewAnalysis = () => {
    setCapturedImage(null);
    setResultData(null);
    setErrorState(null);
    setShowReportModal(false);
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setErrorState(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage })
      });

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      const data = await response.json();
      console.log("[LOOB VISION] API Response:", data);
      setResultData(data);
    } catch (err) {
      console.error("[LOOB VISION] Analysis error:", err);
      setErrorState(err.message || "Failed to complete lubricant analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header 
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      <main className="flex-fill py-4">
        <Container fluid className="px-3 px-md-4">
          <Row className="g-4 align-items-stretch">
            {/* LEFT COLUMN: CAMERA / IMAGE PREVIEW */}
            <Col lg={6} xl={6}>
              <CameraPanel 
                capturedImage={capturedImage}
                onCapture={handleCapture}
                onUpload={handleUpload}
                onRetake={handleRetake}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            </Col>

            {/* RIGHT COLUMN: RESULT ANALYSIS */}
            <Col lg={6} xl={6}>
              <ResultPanel 
                result={resultData}
                isAnalyzing={isAnalyzing}
                error={errorState}
                onNewAnalysis={handleNewAnalysis}
                onRetry={handleAnalyze}
                onOpenReport={() => setShowReportModal(true)}
              />
            </Col>
          </Row>
        </Container>
      </main>

      {/* FULL ANALYSIS REPORT MODAL */}
      <AnalysisReportModal 
        show={showReportModal}
        onHide={() => setShowReportModal(false)}
        result={resultData}
        capturedImage={capturedImage}
      />

      <footer className="loob-footer text-center">
        <Container>
          <div className="fw-semibold mb-1" style={{ letterSpacing: '1px' }}>
            LOOBVISION Industrial AI
          </div>
          <div className="text-muted small">
            AI-Powered Lubricant Condition Analysis & Automated Visual Screening System
          </div>
        </Container>
      </footer>
    </div>
  );
}

// Render React App
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
