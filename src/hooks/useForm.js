import { useState, useCallback } from "react";

/**
 * Hook reutilizable para gestionar formularios
 * @param {Object} initialValues - Valores iniciales del formulario
 * @param {Function} onSubmit - Callback al enviar (recibe values y helpers)
 * @param {Object} validators - Objeto con funciones validadoras por campo
 */
const useForm = (initialValues = {}, onSubmit = null, validators = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  /**
   * Validar un campo específico
   */
  const validateField = useCallback((field, value) => {
    if (validators[field]) {
      return validators[field](value);
    }
    return null;
  }, [validators]);

  /**
   * Validar todos los campos
   */
  const validateForm = useCallback(() => {
    const newErrors = {};
    Object.entries(values).forEach(([field, value]) => {
      const error = validateField(field, value);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validateField]);

  /**
   * Manejar cambios en inputs
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;

    setValues((prev) => ({ ...prev, [name]: fieldValue }));

    // Validar mientras se escribe (si el campo fue tocado)
    if (touched[name]) {
      const error = validateField(name, fieldValue);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  }, [touched, validateField]);

  /**
   * Manejar blur en campos
   */
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, values[name]);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, [values, validateField]);

  /**
   * Enviar formulario
   */
  const handleSubmit = useCallback(
    async (e) => {
      if (e) {
        e.preventDefault();
      }

      setSubmitError(null);

      if (!validateForm()) {
        setSubmitError("Por favor, corrige los errores en el formulario");
        return;
      }

      if (!onSubmit) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values, {
          setSubmitError,
          resetForm: () => {
            setValues(initialValues);
            setErrors({});
            setTouched({});
            setSubmitError(null);
          },
          setFieldValue,
          setFieldError,
          setFieldTouched,
        });
      } catch (error) {
        setSubmitError(error.message || "Error al enviar el formulario");
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateForm, onSubmit, initialValues]
  );

  /**
   * Resetear formulario
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError(null);
  }, [initialValues]);

  /**
   * Setear valor de campo específico
   */
  const setFieldValue = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Setear error de campo específico
   */
  const setFieldError = useCallback((field, error) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  /**
   * Setear touched de campo específico
   */
  const setFieldTouched = useCallback((field, touchedState = true) => {
    setTouched((prev) => ({ ...prev, [field]: touchedState }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    validateField,
    validateForm,
  };
};

export default useForm;
