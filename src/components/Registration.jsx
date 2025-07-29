import React, { useState } from 'react';
import { Upload, X, Calendar, MapPin, Users, FileText, Building, Tag } from 'lucide-react';

const EventRegistrationForm = () => {
  const [formData, setFormData] = useState({
    organizer: '',
    eventName: '',
    description: '',
    locationName: '',
    mode: 'in-person',
    eventDate: '',
    registrationDeadline: '',
    organizationLogo: null,
    eventBanner: null
  });

  const [previews, setPreviews] = useState({
    organizationLogo: null,
    eventBanner: null
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: 'Please upload a valid image file (JPG, PNG, or GIF)'
        }));
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: 'File size must be less than 5MB'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({
          ...prev,
          [fieldName]: e.target.result
        }));
      };
      reader.readAsDataURL(file);

      // Clear error
      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  const removeFile = (fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: null
    }));
    setPreviews(prev => ({
      ...prev,
      [fieldName]: null
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.organizer.trim()) newErrors.organizer = 'Organizer name is required';
    if (!formData.eventName.trim()) newErrors.eventName = 'Event name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.locationName.trim()) newErrors.locationName = 'Location is required';
    if (!formData.eventDate) newErrors.eventDate = 'Event date is required';
    if (!formData.registrationDeadline) newErrors.registrationDeadline = 'Registration deadline is required';

    // Validate dates
    if (formData.eventDate && formData.registrationDeadline) {
      const eventDate = new Date(formData.eventDate);
      const deadlineDate = new Date(formData.registrationDeadline);
      if (deadlineDate >= eventDate) {
        newErrors.registrationDeadline = 'Registration deadline must be before event date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Form submitted:', formData);
      alert('Event registered successfully!');
    }
  };

  const FileUploadArea = ({ fieldName, label, preview, accept = "image/*" }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
        {preview ? (
          <div className="relative">
            <img 
              src={preview} 
              alt={`${label} preview`}
              className="max-w-full h-32 object-contain mx-auto rounded"
            />
            <button
              type="button"
              onClick={() => removeFile(fieldName)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label className="cursor-pointer">
                <span className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
                  Choose File
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept={accept}
                  onChange={(e) => handleFileUpload(e, fieldName)}
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500">PNG, JPG, GIF up to 5MB</p>
          </div>
        )}
      </div>
      {errors[fieldName] && (
        <p className="text-red-500 text-sm">{errors[fieldName]}</p>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Registration</h1>
        <p className="text-gray-600">Fill out the form below to register your event</p>
      </div>

      <div className="space-y-6">
        {/* Organization Logo Upload */}
        <FileUploadArea 
          fieldName="organizationLogo"
          label="Organization Logo"
          preview={previews.organizationLogo}
        />

        {/* Event Banner Upload */}
        <FileUploadArea 
          fieldName="eventBanner"
          label="Event Banner"
          preview={previews.eventBanner}
        />

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organizer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="inline h-4 w-4 mr-1" />
              Organizer
            </label>
            <input
              type="text"
              name="organizer"
              value={formData.organizer}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.organizer ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter organizer name"
            />
            {errors.organizer && <p className="text-red-500 text-sm mt-1">{errors.organizer}</p>}
          </div>

          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="inline h-4 w-4 mr-1" />
              Event Name
            </label>
            <input
              type="text"
              name="eventName"
              value={formData.eventName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.eventName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter event name"
            />
            {errors.eventName && <p className="text-red-500 text-sm mt-1">{errors.eventName}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe your event..."
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Location Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Location Name
            </label>
            <input
              type="text"
              name="locationName"
              value={formData.locationName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.locationName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter location"
            />
            {errors.locationName && <p className="text-red-500 text-sm mt-1">{errors.locationName}</p>}
          </div>

          {/* Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline h-4 w-4 mr-1" />
              Mode
            </label>
            <select
              name="mode"
              value={formData.mode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="in-person">In-Person</option>
              <option value="virtual">Virtual</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Event Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Event Date
            </label>
            <input
              type="datetime-local"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.eventDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.eventDate && <p className="text-red-500 text-sm mt-1">{errors.eventDate}</p>}
          </div>

          {/* Registration Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Registration Deadline
            </label>
            <input
              type="datetime-local"
              name="registrationDeadline"
              value={formData.registrationDeadline}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.registrationDeadline ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.registrationDeadline && <p className="text-red-500 text-sm mt-1">{errors.registrationDeadline}</p>}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-6">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Register Event
          </button>
        </div>
     </div>
    </div>
  );
};

export default EventRegistrationForm;