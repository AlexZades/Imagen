const handleRemix = () => {
    if (!image) return;
    
    const params = new URLSearchParams();
    if (image.promptTags) params.set('promptTags', image.promptTags);
    if (styles.length > 0) params.set('styleId', styles[0].id);
    if (tags.length > 0) params.set('tagIds', tags.map(t => t.id).join(','));
    params.set('aspect', getAspectRatioKey(image.width, image.height));
    
    // Add character tags to the remix parameters
    if (image.maleCharacterTags) params.set('maleTags', image.maleCharacterTags);
    if (image.femaleCharacterTags) params.set('femaleTags', image.femaleCharacterTags);
    if (image.otherCharacterTags) params.set('otherTags', image.otherCharacterTags);
    
    router.push(`/create?${params.toString()}`);
  };