// Handle URL parameters for "Remix" functionality
  useEffect(() => {
    if (!isLoadingData && searchParams && searchParams.size > 0) {
      const styleIdParam = searchParams.get('styleId');
      const tagIdsParam = searchParams.get('tagIds');
      const promptParam = searchParams.get('promptTags');
      const aspectParam = searchParams.get('aspect');

      // Restore character tags from URL parameters
      const maleTagsParam = searchParams.get('maleTags');
      const femaleTagsParam = searchParams.get('femaleTags');
      const otherTagsParam = searchParams.get('otherTags');

      if (styleIdParam && styles.some((s) => s.id === styleIdParam)) {
        setSelectedStyle(styleIdParam);
      }

      if (tagIdsParam) {
        const ids = tagIdsParam
          .split(',')
          .filter((id) => tags.some((t) => t.id === id));
        if (ids.length > 0) {
          setSelectedTagIds(ids);
        }
      }

      if (promptParam) {
        setPromptTags(promptParam);
      }

      if (aspectParam && ['1', '2', '3', '4'].includes(aspectParam)) {
        setAspectRatio(aspectParam);
      }

      // Set character tags if they exist in the URL
      if (maleTagsParam) setMaleTags(maleTagsParam);
      if (femaleTagsParam) setFemaleTags(femaleTagsParam);
      if (otherTagsParam) setOtherTags(otherTagsParam);
    }
  }, [isLoadingData, searchParams, styles, tags]);